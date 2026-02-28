package pkg

// FormalTitleMap maps BFS path keys to Chinese kinship titles.
//
// Key format: "RELATION1>RELATION2>...|GENDER"
//   - Path follows relationship edges from self to target person
//   - GENDER is the target person's gender (male / female)
//
// Covers five generations (高祖辈 → 玄孙辈), including direct, collateral, and in-law relations.
var FormalTitleMap = map[string]string{

	// ============================================================
	//  Layer 0: Spouse
	// ============================================================
	"HUSBAND|male": "丈夫",
	"WIFE|female":  "妻子",

	// ============================================================
	//  Layer 1: Parents / Children / Siblings
	// ============================================================

	// --- Parents ---
	"FATHER|male":   "父亲",
	"MOTHER|female": "母亲",

	// --- Children ---
	"SON|male":       "儿子",
	"DAUGHTER|female": "女儿",

	// --- Siblings ---
	"OLDER_BROTHER|male":    "哥哥",
	"YOUNGER_BROTHER|male":  "弟弟",
	"OLDER_SISTER|female":   "姐姐",
	"YOUNGER_SISTER|female": "妹妹",

	// ============================================================
	//  Layer 2: Grandparents / Grandchildren / Uncles-Aunts / Nephews-Nieces / Spouse relatives
	// ============================================================

	// --- Paternal grandparents ---
	"FATHER>FATHER|male":   "祖父",
	"FATHER>MOTHER|female": "祖母",

	// --- Maternal grandparents ---
	"MOTHER>FATHER|male":   "外祖父",
	"MOTHER>MOTHER|female": "外祖母",

	// --- Grandchildren ---
	"SON>SON|male":             "孙子",
	"SON>DAUGHTER|female":      "孙女",
	"DAUGHTER>SON|male":        "外孙",
	"DAUGHTER>DAUGHTER|female": "外孙女",

	// --- Father's siblings ---
	"FATHER>OLDER_BROTHER|male":    "伯父",
	"FATHER>YOUNGER_BROTHER|male":  "叔父",
	"FATHER>OLDER_SISTER|female":   "姑母",
	"FATHER>YOUNGER_SISTER|female": "姑母",

	// --- Mother's siblings ---
	"MOTHER>OLDER_BROTHER|male":    "舅父",
	"MOTHER>YOUNGER_BROTHER|male":  "舅父",
	"MOTHER>OLDER_SISTER|female":   "姨母",
	"MOTHER>YOUNGER_SISTER|female": "姨母",

	// --- Brother's children (侄) ---
	"OLDER_BROTHER>SON|male":       "侄子",
	"OLDER_BROTHER>DAUGHTER|female": "侄女",
	"YOUNGER_BROTHER>SON|male":      "侄子",
	"YOUNGER_BROTHER>DAUGHTER|female": "侄女",

	// --- Sister's children (外甥) ---
	"OLDER_SISTER>SON|male":         "外甥",
	"OLDER_SISTER>DAUGHTER|female":  "外甥女",
	"YOUNGER_SISTER>SON|male":       "外甥",
	"YOUNGER_SISTER>DAUGHTER|female": "外甥女",

	// --- Children's spouses ---
	"SON>WIFE|female":       "儿媳",
	"DAUGHTER>HUSBAND|male": "女婿",

	// --- Brother's spouses ---
	"OLDER_BROTHER>WIFE|female":   "嫂子",
	"YOUNGER_BROTHER>WIFE|female": "弟媳",

	// --- Sister's spouses ---
	"OLDER_SISTER>HUSBAND|male":   "姐夫",
	"YOUNGER_SISTER>HUSBAND|male": "妹夫",

	// --- Spouse's parents ---
	"HUSBAND>FATHER|male":   "公公",
	"HUSBAND>MOTHER|female": "婆婆",
	"WIFE>FATHER|male":      "岳父",
	"WIFE>MOTHER|female":    "岳母",

	// --- Spouse's siblings ---
	"HUSBAND>OLDER_BROTHER|male":    "大伯子",
	"HUSBAND>YOUNGER_BROTHER|male":  "小叔子",
	"HUSBAND>OLDER_SISTER|female":   "大姑子",
	"HUSBAND>YOUNGER_SISTER|female": "小姑子",
	"WIFE>OLDER_BROTHER|male":       "大舅子",
	"WIFE>YOUNGER_BROTHER|male":     "小舅子",
	"WIFE>OLDER_SISTER|female":      "大姨子",
	"WIFE>YOUNGER_SISTER|female":    "小姨子",

	// ============================================================
	//  Layer 3: Great-grandparents / Great-grandchildren / Cousins / Extended in-laws
	// ============================================================

	// --- Paternal great-grandparents ---
	"FATHER>FATHER>FATHER|male":   "曾祖父",
	"FATHER>FATHER>MOTHER|female": "曾祖母",

	// --- Maternal great-grandparents (via father) ---
	"FATHER>MOTHER>FATHER|male":   "外曾祖父",
	"FATHER>MOTHER>MOTHER|female": "外曾祖母",

	// --- Maternal great-grandparents ---
	"MOTHER>FATHER>FATHER|male":   "外曾祖父",
	"MOTHER>FATHER>MOTHER|female": "外曾祖母",
	"MOTHER>MOTHER>FATHER|male":   "外曾祖父",
	"MOTHER>MOTHER>MOTHER|female": "外曾祖母",

	// --- Great-grandchildren ---
	"SON>SON>SON|male":                "曾孙",
	"SON>SON>DAUGHTER|female":         "曾孙女",
	"SON>DAUGHTER>SON|male":           "外曾孙",
	"SON>DAUGHTER>DAUGHTER|female":    "外曾孙女",
	"DAUGHTER>SON>SON|male":           "外曾孙",
	"DAUGHTER>SON>DAUGHTER|female":    "外曾孙女",
	"DAUGHTER>DAUGHTER>SON|male":      "外曾孙",
	"DAUGHTER>DAUGHTER>DAUGHTER|female": "外曾孙女",

	// --- Paternal cousins (father's brothers' children) ---
	"FATHER>OLDER_BROTHER>SON|male":       "堂兄",
	"FATHER>OLDER_BROTHER>DAUGHTER|female": "堂姐",
	"FATHER>YOUNGER_BROTHER>SON|male":      "堂弟",
	"FATHER>YOUNGER_BROTHER>DAUGHTER|female": "堂妹",

	// --- Cross cousins (father's sisters' children) ---
	"FATHER>OLDER_SISTER>SON|male":       "表兄",
	"FATHER>OLDER_SISTER>DAUGHTER|female": "表姐",
	"FATHER>YOUNGER_SISTER>SON|male":      "表弟",
	"FATHER>YOUNGER_SISTER>DAUGHTER|female": "表妹",

	// --- Cross cousins (mother's brothers' children) ---
	"MOTHER>OLDER_BROTHER>SON|male":       "表兄",
	"MOTHER>OLDER_BROTHER>DAUGHTER|female": "表姐",
	"MOTHER>YOUNGER_BROTHER>SON|male":      "表弟",
	"MOTHER>YOUNGER_BROTHER>DAUGHTER|female": "表妹",

	// --- Cross cousins (mother's sisters' children) ---
	"MOTHER>OLDER_SISTER>SON|male":       "表兄",
	"MOTHER>OLDER_SISTER>DAUGHTER|female": "表姐",
	"MOTHER>YOUNGER_SISTER>SON|male":      "表弟",
	"MOTHER>YOUNGER_SISTER>DAUGHTER|female": "表妹",

	// --- Uncle's spouses ---
	"FATHER>OLDER_BROTHER>WIFE|female":   "伯母",
	"FATHER>YOUNGER_BROTHER>WIFE|female": "婶母",

	// --- Aunt's spouses ---
	"FATHER>OLDER_SISTER>HUSBAND|male":   "姑父",
	"FATHER>YOUNGER_SISTER>HUSBAND|male": "姑父",

	// --- Mother's brother's spouses ---
	"MOTHER>OLDER_BROTHER>WIFE|female":   "舅母",
	"MOTHER>YOUNGER_BROTHER>WIFE|female": "舅母",

	// --- Mother's sister's spouses ---
	"MOTHER>OLDER_SISTER>HUSBAND|male":   "姨父",
	"MOTHER>YOUNGER_SISTER>HUSBAND|male": "姨父",

	// --- Grandchildren's spouses ---
	"SON>SON>WIFE|female":            "孙媳",
	"SON>DAUGHTER>HUSBAND|male":      "孙女婿",
	"DAUGHTER>SON>WIFE|female":       "外孙媳",
	"DAUGHTER>DAUGHTER>HUSBAND|male": "外孙女婿",

	// --- Nephew/niece's spouses ---
	"OLDER_BROTHER>SON>WIFE|female":        "侄媳",
	"OLDER_BROTHER>DAUGHTER>HUSBAND|male":  "侄女婿",
	"YOUNGER_BROTHER>SON>WIFE|female":      "侄媳",
	"YOUNGER_BROTHER>DAUGHTER>HUSBAND|male": "侄女婿",

	// --- Nephew/niece (sister's) spouses ---
	"OLDER_SISTER>SON>WIFE|female":          "外甥媳",
	"OLDER_SISTER>DAUGHTER>HUSBAND|male":    "外甥女婿",
	"YOUNGER_SISTER>SON>WIFE|female":        "外甥媳",
	"YOUNGER_SISTER>DAUGHTER>HUSBAND|male":  "外甥女婿",

	// --- Sisters-in-law (妯娌) ---
	"HUSBAND>OLDER_BROTHER>WIFE|female":   "妯娌",
	"HUSBAND>YOUNGER_BROTHER>WIFE|female": "妯娌",

	// --- Brothers-in-law (连襟) ---
	"WIFE>OLDER_SISTER>HUSBAND|male":   "连襟",
	"WIFE>YOUNGER_SISTER>HUSBAND|male": "连襟",

	// --- Spouse's siblings' spouses ---
	"HUSBAND>OLDER_SISTER>HUSBAND|male":    "姑父",
	"HUSBAND>YOUNGER_SISTER>HUSBAND|male":  "姑父",
	"WIFE>OLDER_BROTHER>WIFE|female":       "舅嫂",
	"WIFE>YOUNGER_BROTHER>WIFE|female":     "舅嫂",

	// --- Grandfather's siblings ---
	"FATHER>FATHER>OLDER_BROTHER|male":    "伯祖父",
	"FATHER>FATHER>YOUNGER_BROTHER|male":  "叔祖父",
	"FATHER>FATHER>OLDER_SISTER|female":   "祖姑母",
	"FATHER>FATHER>YOUNGER_SISTER|female": "祖姑母",

	// --- Grandmother's siblings ---
	"FATHER>MOTHER>OLDER_BROTHER|male":    "舅祖父",
	"FATHER>MOTHER>YOUNGER_BROTHER|male":  "舅祖父",
	"FATHER>MOTHER>OLDER_SISTER|female":   "姨祖母",
	"FATHER>MOTHER>YOUNGER_SISTER|female": "姨祖母",

	// --- Maternal grandfather's siblings ---
	"MOTHER>FATHER>OLDER_BROTHER|male":    "外伯祖父",
	"MOTHER>FATHER>YOUNGER_BROTHER|male":  "外叔祖父",
	"MOTHER>FATHER>OLDER_SISTER|female":   "外祖姑母",
	"MOTHER>FATHER>YOUNGER_SISTER|female": "外祖姑母",

	// --- Maternal grandmother's siblings ---
	"MOTHER>MOTHER>OLDER_BROTHER|male":    "外舅祖父",
	"MOTHER>MOTHER>YOUNGER_BROTHER|male":  "外舅祖父",
	"MOTHER>MOTHER>OLDER_SISTER|female":   "外姨祖母",
	"MOTHER>MOTHER>YOUNGER_SISTER|female": "外姨祖母",

	// --- Nephew's children ---
	"OLDER_BROTHER>SON>SON|male":             "侄孙",
	"OLDER_BROTHER>SON>DAUGHTER|female":      "侄孙女",
	"YOUNGER_BROTHER>SON>SON|male":           "侄孙",
	"YOUNGER_BROTHER>SON>DAUGHTER|female":    "侄孙女",
	"OLDER_BROTHER>DAUGHTER>SON|male":        "侄外孙",
	"OLDER_BROTHER>DAUGHTER>DAUGHTER|female": "侄外孙女",
	"YOUNGER_BROTHER>DAUGHTER>SON|male":      "侄外孙",
	"YOUNGER_BROTHER>DAUGHTER>DAUGHTER|female": "侄外孙女",

	// --- Sister's grandchildren ---
	"OLDER_SISTER>SON>SON|male":          "外甥孙",
	"OLDER_SISTER>SON>DAUGHTER|female":   "外甥孙女",
	"YOUNGER_SISTER>SON>SON|male":        "外甥孙",
	"YOUNGER_SISTER>SON>DAUGHTER|female": "外甥孙女",

	// ============================================================
	//  Layer 4: Great-great-grandparents / Great-great-grandchildren / Clan relatives
	// ============================================================

	// --- Great-great-grandparents ---
	"FATHER>FATHER>FATHER>FATHER|male":   "高祖父",
	"FATHER>FATHER>FATHER>MOTHER|female": "高祖母",

	// --- Maternal great-great-grandparents (multiple paths) ---
	"FATHER>FATHER>MOTHER>FATHER|male":   "外高祖父",
	"FATHER>FATHER>MOTHER>MOTHER|female": "外高祖母",
	"FATHER>MOTHER>FATHER>FATHER|male":   "外高祖父",
	"FATHER>MOTHER>FATHER>MOTHER|female": "外高祖母",
	"FATHER>MOTHER>MOTHER>FATHER|male":   "外高祖父",
	"FATHER>MOTHER>MOTHER>MOTHER|female": "外高祖母",
	"MOTHER>FATHER>FATHER>FATHER|male":   "外高祖父",
	"MOTHER>FATHER>FATHER>MOTHER|female": "外高祖母",
	"MOTHER>FATHER>MOTHER>FATHER|male":   "外高祖父",
	"MOTHER>FATHER>MOTHER>MOTHER|female": "外高祖母",
	"MOTHER>MOTHER>FATHER>FATHER|male":   "外高祖父",
	"MOTHER>MOTHER>FATHER>MOTHER|female": "外高祖母",
	"MOTHER>MOTHER>MOTHER>FATHER|male":   "外高祖父",
	"MOTHER>MOTHER>MOTHER>MOTHER|female": "外高祖母",

	// --- Great-great-grandchildren ---
	"SON>SON>SON>SON|male":                      "玄孙",
	"SON>SON>SON>DAUGHTER|female":               "玄孙女",
	"SON>SON>DAUGHTER>SON|male":                 "外玄孙",
	"SON>SON>DAUGHTER>DAUGHTER|female":          "外玄孙女",
	"SON>DAUGHTER>SON>SON|male":                 "外玄孙",
	"SON>DAUGHTER>SON>DAUGHTER|female":          "外玄孙女",
	"SON>DAUGHTER>DAUGHTER>SON|male":            "外玄孙",
	"SON>DAUGHTER>DAUGHTER>DAUGHTER|female":     "外玄孙女",
	"DAUGHTER>SON>SON>SON|male":                 "外玄孙",
	"DAUGHTER>SON>SON>DAUGHTER|female":          "外玄孙女",
	"DAUGHTER>SON>DAUGHTER>SON|male":            "外玄孙",
	"DAUGHTER>SON>DAUGHTER>DAUGHTER|female":     "外玄孙女",
	"DAUGHTER>DAUGHTER>SON>SON|male":            "外玄孙",
	"DAUGHTER>DAUGHTER>SON>DAUGHTER|female":     "外玄孙女",
	"DAUGHTER>DAUGHTER>DAUGHTER>SON|male":       "外玄孙",
	"DAUGHTER>DAUGHTER>DAUGHTER>DAUGHTER|female": "外玄孙女",

	// --- Clan siblings (grandfather's brothers' grandchildren) ---
	// Note: The SON>SON and SON>DAUGHTER paths overlap with the clan uncles entry below.
	// In the JS source, the later entry (clan uncle) wins due to last-write-wins semantics.
	// Therefore, only DAUGHTER paths are kept here for the clan sibling group.
	"FATHER>FATHER>OLDER_BROTHER>DAUGHTER>SON|male":          "族兄",
	"FATHER>FATHER>OLDER_BROTHER>DAUGHTER>DAUGHTER|female":   "族姐",
	"FATHER>FATHER>YOUNGER_BROTHER>DAUGHTER>SON|male":        "族弟",
	"FATHER>FATHER>YOUNGER_BROTHER>DAUGHTER>DAUGHTER|female": "族妹",

	// --- Clan uncles (grandfather's brothers' sons) ---
	"FATHER>FATHER>OLDER_BROTHER>SON|male":       "堂伯父",
	"FATHER>FATHER>YOUNGER_BROTHER>SON|male":     "堂叔父",
	"FATHER>FATHER>OLDER_BROTHER>DAUGHTER|female":  "堂姑母",
	"FATHER>FATHER>YOUNGER_BROTHER>DAUGHTER|female": "堂姑母",

	// --- Paternal cousin's children ---
	"FATHER>OLDER_BROTHER>SON>SON|male":           "堂侄",
	"FATHER>OLDER_BROTHER>SON>DAUGHTER|female":    "堂侄女",
	"FATHER>YOUNGER_BROTHER>SON>SON|male":         "堂侄",
	"FATHER>YOUNGER_BROTHER>SON>DAUGHTER|female":  "堂侄女",
	"FATHER>OLDER_BROTHER>DAUGHTER>SON|male":      "堂外甥",
	"FATHER>OLDER_BROTHER>DAUGHTER>DAUGHTER|female":  "堂外甥女",
	"FATHER>YOUNGER_BROTHER>DAUGHTER>SON|male":       "堂外甥",
	"FATHER>YOUNGER_BROTHER>DAUGHTER>DAUGHTER|female": "堂外甥女",

	// --- Cross cousin's children (via father's sisters) ---
	"FATHER>OLDER_SISTER>SON>SON|male":              "表侄",
	"FATHER>OLDER_SISTER>SON>DAUGHTER|female":       "表侄女",
	"FATHER>YOUNGER_SISTER>SON>SON|male":            "表侄",
	"FATHER>YOUNGER_SISTER>SON>DAUGHTER|female":     "表侄女",
	"FATHER>OLDER_SISTER>DAUGHTER>SON|male":         "表外甥",
	"FATHER>OLDER_SISTER>DAUGHTER>DAUGHTER|female":  "表外甥女",
	"FATHER>YOUNGER_SISTER>DAUGHTER>SON|male":       "表外甥",
	"FATHER>YOUNGER_SISTER>DAUGHTER>DAUGHTER|female": "表外甥女",

	// --- Cross cousin's children (via mother's brothers) ---
	"MOTHER>OLDER_BROTHER>SON>SON|male":              "表侄",
	"MOTHER>OLDER_BROTHER>SON>DAUGHTER|female":       "表侄女",
	"MOTHER>YOUNGER_BROTHER>SON>SON|male":            "表侄",
	"MOTHER>YOUNGER_BROTHER>SON>DAUGHTER|female":     "表侄女",
	"MOTHER>OLDER_BROTHER>DAUGHTER>SON|male":         "表外甥",
	"MOTHER>OLDER_BROTHER>DAUGHTER>DAUGHTER|female":  "表外甥女",
	"MOTHER>YOUNGER_BROTHER>DAUGHTER>SON|male":       "表外甥",
	"MOTHER>YOUNGER_BROTHER>DAUGHTER>DAUGHTER|female": "表外甥女",

	// --- Cross cousin's children (via mother's sisters) ---
	"MOTHER>OLDER_SISTER>SON>SON|male":              "表侄",
	"MOTHER>OLDER_SISTER>SON>DAUGHTER|female":       "表侄女",
	"MOTHER>YOUNGER_SISTER>SON>SON|male":            "表侄",
	"MOTHER>YOUNGER_SISTER>SON>DAUGHTER|female":     "表侄女",
	"MOTHER>OLDER_SISTER>DAUGHTER>SON|male":         "表外甥",
	"MOTHER>OLDER_SISTER>DAUGHTER>DAUGHTER|female":  "表外甥女",
	"MOTHER>YOUNGER_SISTER>DAUGHTER>SON|male":       "表外甥",
	"MOTHER>YOUNGER_SISTER>DAUGHTER>DAUGHTER|female": "表外甥女",

	// --- Great-grandfather's siblings ---
	"FATHER>FATHER>FATHER>OLDER_BROTHER|male":    "曾伯祖父",
	"FATHER>FATHER>FATHER>YOUNGER_BROTHER|male":  "曾叔祖父",
	"FATHER>FATHER>FATHER>OLDER_SISTER|female":   "曾祖姑母",
	"FATHER>FATHER>FATHER>YOUNGER_SISTER|female": "曾祖姑母",

	// --- Grand-uncle's spouses ---
	"FATHER>FATHER>OLDER_BROTHER>WIFE|female":   "伯祖母",
	"FATHER>FATHER>YOUNGER_BROTHER>WIFE|female": "叔祖母",

	// --- Grand-aunt's spouses ---
	"FATHER>FATHER>OLDER_SISTER>HUSBAND|male":   "祖姑父",
	"FATHER>FATHER>YOUNGER_SISTER>HUSBAND|male": "祖姑父",

	// --- Great-grandchildren's spouses ---
	"SON>SON>SON>WIFE|female":            "曾孙媳",
	"SON>SON>DAUGHTER>HUSBAND|male":      "曾孙女婿",
	"DAUGHTER>SON>SON>WIFE|female":       "外曾孙媳",
	"DAUGHTER>SON>DAUGHTER>HUSBAND|male": "外曾孙女婿",

	// --- Paternal cousin's spouses ---
	"FATHER>OLDER_BROTHER>SON>WIFE|female":        "堂嫂",
	"FATHER>YOUNGER_BROTHER>SON>WIFE|female":      "堂弟媳",
	"FATHER>OLDER_BROTHER>DAUGHTER>HUSBAND|male":  "堂姐夫",
	"FATHER>YOUNGER_BROTHER>DAUGHTER>HUSBAND|male": "堂妹夫",

	// --- Cross cousin's spouses (via father's sisters) ---
	"FATHER>OLDER_SISTER>SON>WIFE|female":          "表嫂",
	"FATHER>YOUNGER_SISTER>SON>WIFE|female":        "表弟媳",
	"FATHER>OLDER_SISTER>DAUGHTER>HUSBAND|male":    "表姐夫",
	"FATHER>YOUNGER_SISTER>DAUGHTER>HUSBAND|male":  "表妹夫",

	// --- Cross cousin's spouses (via mother's brothers) ---
	"MOTHER>OLDER_BROTHER>SON>WIFE|female":   "表嫂",
	"MOTHER>YOUNGER_BROTHER>SON>WIFE|female": "表弟媳",

	// --- Cross cousin's spouses (via mother's sisters) ---
	"MOTHER>OLDER_SISTER>SON>WIFE|female":   "表嫂",
	"MOTHER>YOUNGER_SISTER>SON>WIFE|female": "表弟媳",

	// ============================================================
	//  Layer 5: Spanning 5 generations (BFS_MAX_DEPTH = 5)
	// ============================================================

	// --- Great-great-grandfather's siblings ---
	"FATHER>FATHER>FATHER>FATHER>OLDER_BROTHER|male":    "高伯祖父",
	"FATHER>FATHER>FATHER>FATHER>YOUNGER_BROTHER|male":  "高叔祖父",
	"FATHER>FATHER>FATHER>FATHER>OLDER_SISTER|female":   "高祖姑母",
	"FATHER>FATHER>FATHER>FATHER>YOUNGER_SISTER|female": "高祖姑母",

	// --- Great-grand-uncle's sons (clan grandfathers) ---
	"FATHER>FATHER>FATHER>OLDER_BROTHER>SON|male":       "族伯祖父",
	"FATHER>FATHER>FATHER>YOUNGER_BROTHER>SON|male":     "族叔祖父",
	"FATHER>FATHER>FATHER>OLDER_BROTHER>DAUGHTER|female":  "族祖姑母",
	"FATHER>FATHER>FATHER>YOUNGER_BROTHER>DAUGHTER|female": "族祖姑母",

	// --- Grand-uncle's grandsons (clan uncles) ---
	"FATHER>FATHER>OLDER_BROTHER>SON>SON|male":       "族伯父",
	"FATHER>FATHER>YOUNGER_BROTHER>SON>SON|male":     "族叔父",
	"FATHER>FATHER>OLDER_BROTHER>SON>DAUGHTER|female":  "族姑母",
	"FATHER>FATHER>YOUNGER_BROTHER>SON>DAUGHTER|female": "族姑母",

	// --- Clan uncle's spouses ---
	"FATHER>FATHER>OLDER_BROTHER>SON>WIFE|female":   "堂伯母",
	"FATHER>FATHER>YOUNGER_BROTHER>SON>WIFE|female": "堂婶母",

	// --- Great-great-grandchildren's spouses ---
	"SON>SON>SON>SON>WIFE|female":            "玄孙媳",
	"SON>SON>SON>DAUGHTER>HUSBAND|male":      "玄孙女婿",

	// --- Nephew's grandchildren ---
	"OLDER_BROTHER>SON>SON>SON|male":          "侄曾孙",
	"OLDER_BROTHER>SON>SON>DAUGHTER|female":   "侄曾孙女",
	"YOUNGER_BROTHER>SON>SON>SON|male":        "侄曾孙",
	"YOUNGER_BROTHER>SON>SON>DAUGHTER|female": "侄曾孙女",

	// --- Sister's great-grandchildren ---
	"OLDER_SISTER>SON>SON>SON|male":          "外甥曾孙",
	"OLDER_SISTER>SON>SON>DAUGHTER|female":   "外甥曾孙女",
	"YOUNGER_SISTER>SON>SON>SON|male":        "外甥曾孙",
	"YOUNGER_SISTER>SON>SON>DAUGHTER|female": "外甥曾孙女",

	// --- Spouse's grandparents ---
	"HUSBAND>FATHER>FATHER|male":   "公祖父",
	"HUSBAND>FATHER>MOTHER|female": "公祖母",
	"WIFE>FATHER>FATHER|male":      "岳祖父",
	"WIFE>FATHER>MOTHER|female":    "岳祖母",
	"HUSBAND>MOTHER>FATHER|male":   "公外祖父",
	"HUSBAND>MOTHER>MOTHER|female": "公外祖母",
	"WIFE>MOTHER>FATHER|male":      "岳外祖父",
	"WIFE>MOTHER>MOTHER|female":    "岳外祖母",

	// --- Spouse's siblings' children ---
	"HUSBAND>OLDER_BROTHER>SON|male":       "夫侄",
	"HUSBAND>OLDER_BROTHER>DAUGHTER|female": "夫侄女",
	"HUSBAND>YOUNGER_BROTHER>SON|male":      "夫侄",
	"HUSBAND>YOUNGER_BROTHER>DAUGHTER|female": "夫侄女",
	"WIFE>OLDER_BROTHER>SON|male":           "妻外甥",
	"WIFE>OLDER_BROTHER>DAUGHTER|female":    "妻外甥女",
	"WIFE>YOUNGER_BROTHER>SON|male":         "妻外甥",
	"WIFE>YOUNGER_BROTHER>DAUGHTER|female":  "妻外甥女",
	"HUSBAND>OLDER_SISTER>SON|male":         "夫外甥",
	"HUSBAND>OLDER_SISTER>DAUGHTER|female":  "夫外甥女",
	"HUSBAND>YOUNGER_SISTER>SON|male":       "夫外甥",
	"HUSBAND>YOUNGER_SISTER>DAUGHTER|female": "夫外甥女",
	"WIFE>OLDER_SISTER>SON|male":            "妻外甥",
	"WIFE>OLDER_SISTER>DAUGHTER|female":     "妻外甥女",
	"WIFE>YOUNGER_SISTER>SON|male":          "妻外甥",
	"WIFE>YOUNGER_SISTER>DAUGHTER|female":   "妻外甥女",

	// --- Nephew-grandson's spouses ---
	"OLDER_BROTHER>SON>SON>WIFE|female":        "侄孙媳",
	"OLDER_BROTHER>SON>DAUGHTER>HUSBAND|male":  "侄孙女婿",
	"YOUNGER_BROTHER>SON>SON>WIFE|female":      "侄孙媳",
	"YOUNGER_BROTHER>SON>DAUGHTER>HUSBAND|male": "侄孙女婿",

	// --- Grand-uncle (maternal) spouses ---
	"FATHER>MOTHER>OLDER_BROTHER>WIFE|female":   "舅祖母",
	"FATHER>MOTHER>YOUNGER_BROTHER>WIFE|female": "舅祖母",

	// --- Grand-aunt (maternal) spouses ---
	"FATHER>MOTHER>OLDER_SISTER>HUSBAND|male":   "姨祖父",
	"FATHER>MOTHER>YOUNGER_SISTER>HUSBAND|male": "姨祖父",

	// --- Great-grand-uncle's spouses ---
	"FATHER>FATHER>FATHER>OLDER_BROTHER>WIFE|female":   "曾伯祖母",
	"FATHER>FATHER>FATHER>YOUNGER_BROTHER>WIFE|female": "曾叔祖母",
}
