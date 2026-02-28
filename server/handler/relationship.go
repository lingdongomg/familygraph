package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"familygraph/middleware"
	"familygraph/pkg"
	"familygraph/store"
)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// RelationTypes is the list of valid relationship types.
var RelationTypes = []string{
	"FATHER", "MOTHER", "SON", "DAUGHTER",
	"HUSBAND", "WIFE",
	"OLDER_BROTHER", "YOUNGER_BROTHER", "OLDER_SISTER", "YOUNGER_SISTER",
}

// ReverseRelation maps a relation type to its reverse, keyed by the *other* person's gender.
var ReverseRelation = map[string]map[string]string{
	"FATHER":          {"male": "SON", "female": "DAUGHTER"},
	"MOTHER":          {"male": "SON", "female": "DAUGHTER"},
	"SON":             {"male": "FATHER", "female": "MOTHER"},
	"DAUGHTER":        {"male": "FATHER", "female": "MOTHER"},
	"HUSBAND":         {"male": "WIFE", "female": "WIFE"},
	"WIFE":            {"male": "HUSBAND", "female": "HUSBAND"},
	"OLDER_BROTHER":   {"male": "YOUNGER_BROTHER", "female": "YOUNGER_SISTER"},
	"YOUNGER_BROTHER": {"male": "OLDER_BROTHER", "female": "OLDER_SISTER"},
	"OLDER_SISTER":    {"male": "YOUNGER_BROTHER", "female": "YOUNGER_SISTER"},
	"YOUNGER_SISTER":  {"male": "OLDER_BROTHER", "female": "OLDER_SISTER"},
}

// BFSMaxDepth is the maximum BFS traversal depth.
const BFSMaxDepth = 5

// isValidRelationType checks whether the given string is in RelationTypes.
func isValidRelationType(rt string) bool {
	for _, t := range RelationTypes {
		if t == rt {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// RelationshipCreate — POST /api/v1/relationship
// Creates forward + reverse relationship edges.
// ---------------------------------------------------------------------------

func RelationshipCreate(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req struct {
		FamilyID     string `json:"family_id"`
		FromID       string `json:"from_id"`
		ToID         string `json:"to_id"`
		RelationType string `json:"relation_type"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		Fail(w, "请求格式错误")
		return
	}

	if req.FamilyID == "" || req.FromID == "" || req.ToID == "" || req.RelationType == "" {
		Fail(w, "缺少必填参数 (family_id, from_id, to_id, relation_type)")
		return
	}

	if req.FromID == req.ToID {
		Fail(w, "不能创建指向自身的关系")
		return
	}

	if !isValidRelationType(req.RelationType) {
		Fail(w, "无效的关系类型: "+req.RelationType)
		return
	}

	// Permission check: must be owner or member
	membership, err := store.CheckMembership(openid, req.FamilyID)
	if err != nil || membership == nil {
		Fail(w, "您不是该家庭成员", -3)
		return
	}
	if !store.HasPermission(membership.Role, "member") {
		Fail(w, "权限不足，需要成员或管理员角色", -4)
		return
	}

	db := store.DB

	// Validate both persons exist and belong to the family
	var fromFamilyID, toFamilyID, toGender string
	err = db.QueryRow("SELECT family_id FROM persons WHERE id = ?", req.FromID).Scan(&fromFamilyID)
	if err != nil {
		Fail(w, "起始人物不存在")
		return
	}
	err = db.QueryRow("SELECT family_id, gender FROM persons WHERE id = ?", req.ToID).Scan(&toFamilyID, &toGender)
	if err != nil {
		Fail(w, "目标人物不存在")
		return
	}
	if fromFamilyID != req.FamilyID {
		Fail(w, "起始人物不属于该家庭")
		return
	}
	if toFamilyID != req.FamilyID {
		Fail(w, "目标人物不属于该家庭")
		return
	}

	// Determine reverse relation type based on target person's gender
	reverseMapping, ok := ReverseRelation[req.RelationType]
	if !ok {
		Fail(w, "无法确定 "+req.RelationType+" 的反向关系")
		return
	}
	reverseType, ok := reverseMapping[toGender]
	if !ok {
		Fail(w, "无法确定性别为 "+toGender+" 的反向关系类型")
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)

	// Create forward edge
	var forwardID string
	err = db.QueryRow(
		"INSERT INTO relationships (family_id, from_id, to_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
		req.FamilyID, req.FromID, req.ToID, req.RelationType, now,
	).Scan(&forwardID)
	if err != nil {
		Fail(w, "创建正向关系失败")
		return
	}

	// Create reverse edge
	var reverseID string
	err = db.QueryRow(
		"INSERT INTO relationships (family_id, from_id, to_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
		req.FamilyID, req.ToID, req.FromID, reverseType, now,
	).Scan(&reverseID)
	if err != nil {
		Fail(w, "创建反向关系失败")
		return
	}

	OK(w, map[string]interface{}{
		"forward": map[string]interface{}{
			"_id":           forwardID,
			"family_id":     req.FamilyID,
			"from_id":       req.FromID,
			"to_id":         req.ToID,
			"relation_type": req.RelationType,
			"created_at":    now,
		},
		"reverse": map[string]interface{}{
			"_id":           reverseID,
			"family_id":     req.FamilyID,
			"from_id":       req.ToID,
			"to_id":         req.FromID,
			"relation_type": reverseType,
			"created_at":    now,
		},
	})
}

// ---------------------------------------------------------------------------
// RelationshipDelete — DELETE /api/v1/relationship/{id}
// Deletes forward edge and finds+deletes reverse edge.
// ---------------------------------------------------------------------------

func RelationshipDelete(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	relationshipID := r.PathValue("id")

	if relationshipID == "" {
		Fail(w, "缺少关系ID")
		return
	}

	// Read family_id from query param (same as JS: passed in event params)
	familyID := r.URL.Query().Get("family_id")
	if familyID == "" {
		Fail(w, "缺少必填参数 (family_id)")
		return
	}

	// Permission check
	membership, err := store.CheckMembership(openid, familyID)
	if err != nil || membership == nil {
		Fail(w, "您不是该家庭成员", -3)
		return
	}
	if !store.HasPermission(membership.Role, "member") {
		Fail(w, "权限不足，需要成员或管理员角色", -4)
		return
	}

	db := store.DB

	// Find the original relationship record
	var relFamilyID, fromID, toID string
	err = db.QueryRow(
		"SELECT family_id, from_id, to_id FROM relationships WHERE id = ?", relationshipID,
	).Scan(&relFamilyID, &fromID, &toID)
	if err != nil {
		Fail(w, "关系记录不存在")
		return
	}
	if relFamilyID != familyID {
		Fail(w, "关系记录不属于该家庭")
		return
	}

	// Find reverse edge: from_id and to_id swapped, same family
	var reverseID sql.NullString
	err = db.QueryRow(
		"SELECT id FROM relationships WHERE family_id = ? AND from_id = ? AND to_id = ? LIMIT 1",
		familyID, toID, fromID,
	).Scan(&reverseID)
	if err != nil && err != sql.ErrNoRows {
		Fail(w, "查找反向关系失败")
		return
	}

	// Delete forward edge
	_, err = db.Exec("DELETE FROM relationships WHERE id = ?", relationshipID)
	if err != nil {
		Fail(w, "删除正向关系失败")
		return
	}

	// Delete reverse edge if it exists
	var deletedReverse interface{}
	if reverseID.Valid {
		_, err = db.Exec("DELETE FROM relationships WHERE id = ?", reverseID.String)
		if err != nil {
			Fail(w, "删除反向关系失败")
			return
		}
		deletedReverse = reverseID.String
	}

	OK(w, map[string]interface{}{
		"deleted_forward": relationshipID,
		"deleted_reverse": deletedReverse,
	})
}

// ---------------------------------------------------------------------------
// RelationshipComputeTitle — GET /api/v1/relationship/title?family_id=x&from_person_id=y&to_person_id=z
// BFS shortest path from from_person to to_person, then look up title.
// ---------------------------------------------------------------------------

func RelationshipComputeTitle(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	_ = openid // available for future use; JS version used it for membership check implicitly

	familyID := r.URL.Query().Get("family_id")
	fromPersonID := r.URL.Query().Get("from_person_id")
	toPersonID := r.URL.Query().Get("to_person_id")

	if familyID == "" || fromPersonID == "" || toPersonID == "" {
		Fail(w, "缺少必填参数 (family_id, from_person_id, to_person_id)")
		return
	}

	if fromPersonID == toPersonID {
		OK(w, map[string]interface{}{"title": "本人", "path_key": nil})
		return
	}

	db := store.DB

	// Load all edges for the family
	edgeRows, err := db.Query(
		"SELECT from_id, to_id, relation_type FROM relationships WHERE family_id = ?", familyID,
	)
	if err != nil {
		Fail(w, "查询关系失败")
		return
	}
	defer edgeRows.Close()

	adjacency := make(map[string][]bfsEdge)
	for edgeRows.Next() {
		var fromID, toID, relType string
		if err := edgeRows.Scan(&fromID, &toID, &relType); err != nil {
			continue
		}
		adjacency[fromID] = append(adjacency[fromID], bfsEdge{ToID: toID, RelationType: relType})
	}

	// Load all persons' gender for the family
	personRows, err := db.Query(
		"SELECT id, gender FROM persons WHERE family_id = ?", familyID,
	)
	if err != nil {
		Fail(w, "查询人物失败")
		return
	}
	defer personRows.Close()

	genderMap := make(map[string]string)
	for personRows.Next() {
		var id, gender string
		if err := personRows.Scan(&id, &gender); err != nil {
			continue
		}
		genderMap[id] = gender
	}

	// Get target person's gender
	targetGender, ok := genderMap[toPersonID]
	if !ok {
		Fail(w, "目标人物不存在")
		return
	}

	// BFS
	title := bfsComputeTitle(adjacency, fromPersonID, toPersonID, targetGender, genderMap, nil)

	OK(w, map[string]interface{}{"title": title})
}

// ---------------------------------------------------------------------------
// RelationshipGetGraph — GET /api/v1/relationship/graph?family_id=xxx
// Returns nodes, edges, and titles (BFS-computed from caller's bound person).
// ---------------------------------------------------------------------------

func RelationshipGetGraph(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")

	if familyID == "" {
		Fail(w, "缺少必填参数 (family_id)")
		return
	}

	// Permission check
	membership, err := store.CheckMembership(openid, familyID)
	if err != nil || membership == nil {
		Fail(w, "您不是该家庭成员", -3)
		return
	}

	db := store.DB

	// ---- Load persons ----
	personRows, err := db.Query(
		"SELECT id, name, gender, generation, avatar, avatar_public, bound_user_id FROM persons WHERE family_id = ?",
		familyID,
	)
	if err != nil {
		Fail(w, "查询人物失败")
		return
	}
	defer personRows.Close()

	type personNode struct {
		ID          string         `json:"_id"`
		Name        string         `json:"name"`
		Gender      string         `json:"gender"`
		Generation  int            `json:"generation"`
		Avatar      string         `json:"avatar"`
		AvatarPublic int           // internal; not marshalled directly
		BoundUserID sql.NullString `json:"-"`
	}

	var nodes []personNode
	genderMap := make(map[string]string)

	for personRows.Next() {
		var n personNode
		if err := personRows.Scan(&n.ID, &n.Name, &n.Gender, &n.Generation, &n.Avatar, &n.AvatarPublic, &n.BoundUserID); err != nil {
			continue
		}
		nodes = append(nodes, n)
		genderMap[n.ID] = n.Gender
	}

	// ---- Load edges ----
	edgeRows, err := db.Query(
		"SELECT id, family_id, from_id, to_id, relation_type, created_at FROM relationships WHERE family_id = ?",
		familyID,
	)
	if err != nil {
		Fail(w, "查询关系失败")
		return
	}
	defer edgeRows.Close()

	type relationEdge struct {
		ID           string `json:"_id"`
		FamilyID     string `json:"family_id"`
		FromID       string `json:"from_id"`
		ToID         string `json:"to_id"`
		RelationType string `json:"relation_type"`
		CreatedAt    string `json:"created_at"`
	}

	type adjacencyEdge struct {
		ToID         string
		RelationType string
	}

	var edges []relationEdge
	adjacency := make(map[string][]adjacencyEdge)

	for edgeRows.Next() {
		var e relationEdge
		if err := edgeRows.Scan(&e.ID, &e.FamilyID, &e.FromID, &e.ToID, &e.RelationType, &e.CreatedAt); err != nil {
			continue
		}
		edges = append(edges, e)
		adjacency[e.FromID] = append(adjacency[e.FromID], adjacencyEdge{ToID: e.ToID, RelationType: e.RelationType})
	}

	// ---- Load person_notes for custom_title ----
	noteRows, err := db.Query(
		"SELECT person_id, custom_title FROM person_notes WHERE family_id = ? AND user_id = ?",
		familyID, openid,
	)
	if err != nil {
		Fail(w, "查询备注失败")
		return
	}
	defer noteRows.Close()

	customTitleMap := make(map[string]string)
	for noteRows.Next() {
		var personID, customTitle string
		if err := noteRows.Scan(&personID, &customTitle); err != nil {
			continue
		}
		if customTitle != "" {
			customTitleMap[personID] = customTitle
		}
	}

	// ---- Load custom title map overrides if adopted ----
	var titleMapOverrides map[string]string
	if membership.AdoptedTitleMapID.Valid && membership.AdoptedTitleMapID.String != "" {
		var overridesJSON string
		err := db.QueryRow(
			"SELECT overrides FROM custom_title_maps WHERE id = ?", membership.AdoptedTitleMapID.String,
		).Scan(&overridesJSON)
		if err == nil && overridesJSON != "" {
			_ = json.Unmarshal([]byte(overridesJSON), &titleMapOverrides)
		}
	}

	// ---- Find caller's bound person ----
	var myPersonID string
	for _, n := range nodes {
		if n.BoundUserID.Valid && n.BoundUserID.String == openid {
			myPersonID = n.ID
			break
		}
	}

	// ---- Compute titles ----
	type titleInfo struct {
		FormalTitle  interface{} `json:"formal_title"`
		CustomTitle interface{} `json:"custom_title"`
	}
	titles := make(map[string]titleInfo)

	if myPersonID != "" {
		// Build an adjacency list compatible with bfsComputeTitle
		bfsAdj := make(map[string][]bfsEdge)
		for k, v := range adjacency {
			for _, e := range v {
				bfsAdj[k] = append(bfsAdj[k], bfsEdge{ToID: e.ToID, RelationType: e.RelationType})
			}
		}

		for _, node := range nodes {
			ct := customTitleMap[node.ID]
			var customTitleVal interface{}
			if ct != "" {
				customTitleVal = ct
			}

			if node.ID == myPersonID {
				titles[node.ID] = titleInfo{
					FormalTitle:  "本人",
					CustomTitle: customTitleVal,
				}
				continue
			}

			formalTitle := bfsComputeTitle(bfsAdj, myPersonID, node.ID, node.Gender, genderMap, titleMapOverrides)
			titles[node.ID] = titleInfo{
				FormalTitle:  formalTitle,
				CustomTitle: customTitleVal,
			}
		}
	} else {
		// Caller not bound to a person — only fill custom titles
		for _, node := range nodes {
			ct := customTitleMap[node.ID]
			var customTitleVal interface{}
			if ct != "" {
				customTitleVal = ct
			}
			titles[node.ID] = titleInfo{
				FormalTitle:  nil,
				CustomTitle: customTitleVal,
			}
		}
	}

	// ---- Filter avatar visibility ----
	isOwner := membership.Role == "owner"

	type outputNode struct {
		ID          string `json:"_id"`
		Name        string `json:"name"`
		Gender      string `json:"gender"`
		Generation  int    `json:"generation"`
		Avatar      string `json:"avatar"`
		BoundUserID string `json:"bound_user_id"`
	}

	filteredNodes := make([]outputNode, 0, len(nodes))
	for _, n := range nodes {
		isSelf := n.BoundUserID.Valid && n.BoundUserID.String == openid
		avatarVisible := isSelf || isOwner || n.AvatarPublic != 0

		avatar := ""
		if avatarVisible {
			avatar = n.Avatar
		}

		boundUID := ""
		if n.BoundUserID.Valid {
			boundUID = n.BoundUserID.String
		}

		filteredNodes = append(filteredNodes, outputNode{
			ID:          n.ID,
			Name:        n.Name,
			Gender:      n.Gender,
			Generation:  n.Generation,
			Avatar:      avatar,
			BoundUserID: boundUID,
		})
	}

	// Ensure non-nil slices for JSON
	if filteredNodes == nil {
		filteredNodes = []outputNode{}
	}
	if edges == nil {
		edges = []relationEdge{}
	}

	OK(w, map[string]interface{}{
		"nodes":  filteredNodes,
		"edges":  edges,
		"titles": titles,
	})
}

// ---------------------------------------------------------------------------
// BFS helper
// ---------------------------------------------------------------------------

// bfsEdge is used in the BFS adjacency list.
type bfsEdge struct {
	ToID         string
	RelationType string
}

// bfsComputeTitle performs a BFS from startID to endID over the adjacency list.
//
// Edge semantics: edge.relation_type means "from_id is X of to_id".
// FORMAL_TITLE_MAP semantics: "target is Y relative to me".
// So each edge traversal reverses: REVERSE_RELATION[X][toGender] gives
// "to is Y of from".
//
// The path key is built as "REL1>REL2>...|targetGender" and looked up
// first in titleMapOverrides, then in pkg.FormalTitleMap, defaulting to "亲属".
func bfsComputeTitle(
	adjacency map[string][]bfsEdge,
	startID, endID, targetGender string,
	genderMap map[string]string,
	titleMapOverrides map[string]string,
) string {

	type bfsNode struct {
		PersonID string
		Path     []string
	}

	visited := make(map[string]bool)
	queue := []bfsNode{{PersonID: startID, Path: nil}}
	visited[startID] = true

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		if len(current.Path) >= BFSMaxDepth {
			continue
		}

		neighbors := adjacency[current.PersonID]
		for _, neighbor := range neighbors {
			if visited[neighbor.ToID] {
				continue
			}

			// Reverse the edge type
			toGender := genderMap[neighbor.ToID]
			if toGender == "" {
				toGender = "male" // default
			}

			reversedType := neighbor.RelationType // fallback
			if reverseMap, ok := ReverseRelation[neighbor.RelationType]; ok {
				if rt, ok2 := reverseMap[toGender]; ok2 {
					reversedType = rt
				}
			}

			newPath := make([]string, len(current.Path)+1)
			copy(newPath, current.Path)
			newPath[len(current.Path)] = reversedType

			if neighbor.ToID == endID {
				pathKey := strings.Join(newPath, ">") + "|" + targetGender

				// Priority: custom overrides > system FORMAL_TITLE_MAP > default
				if titleMapOverrides != nil {
					if title, ok := titleMapOverrides[pathKey]; ok {
						return title
					}
				}
				if title, ok := pkg.FormalTitleMap[pathKey]; ok {
					return title
				}
				return "亲属"
			}

			visited[neighbor.ToID] = true
			queue = append(queue, bfsNode{PersonID: neighbor.ToID, Path: newPath})
		}
	}

	return "亲属"
}
