const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { getOpenId, success, fail, checkMembership, hasPermission } = require('./utils/helpers')
const {
  SHARED_FIELDS, PRIVATE_OVERLAY_FIELDS, ENCRYPTED_FIELDS,
  REVERSE_RELATION, GENERATION_DELTA, RELATION_TYPES,
  SIBLING_TYPES, CHILD_TYPES, PARENT_TYPES, SPOUSE_TYPES
} = require('./utils/constants')
const { encrypt, decrypt } = require('./utils/crypto')

const db = cloud.database()
const _ = db.command

// ────────────────────────────────────────
// Router
// ────────────────────────────────────────
exports.main = async (event, context) => {
  const { action, ...params } = event
  const actions = { create, update, delete: del, getDetail, list }

  if (!actions[action]) {
    return fail(`未知操作: ${action}`)
  }

  try {
    return await actions[action](params, context)
  } catch (err) {
    console.error(`[person/${action}]`, err)
    return fail(err.message || '服务器内部错误')
  }
}

// ────────────────────────────────────────
// create — 创建成员并建立关系
// ────────────────────────────────────────
async function create(params) {
  const {
    family_id, name, gender, birth_year,
    reference_person_id, relation_type
  } = params

  if (!family_id || !name || !gender) {
    return fail('缺少必填参数')
  }

  // If reference provided, relation_type is also required
  const isFirstMember = !reference_person_id
  if (!isFirstMember && !relation_type) {
    return fail('指定了参照成员时必须选择关系类型')
  }

  if (relation_type && !RELATION_TYPES.includes(relation_type)) {
    return fail(`无效的关系类型: ${relation_type}`)
  }

  const openid = getOpenId()
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) return fail('您不是该家庭的成员')
  if (!hasPermission(membership.role, 'member')) {
    return fail('Restricted 用户无权创建成员')
  }

  let generation = 0

  if (!isFirstMember) {
    // Look up reference person to derive generation
    const refRes = await db.collection('persons').doc(reference_person_id).get()
    const refPerson = refRes.data
    if (!refPerson || refPerson.family_id !== family_id) {
      return fail('参照成员不存在或不属于该家庭')
    }

    const delta = GENERATION_DELTA[relation_type]
    if (delta === undefined) {
      return fail('无法计算辈分差')
    }
    generation = (refPerson.generation || 0) + delta
  }

  const now = db.serverDate()

  // Create person record
  const personData = {
    family_id,
    name,
    gender,
    birth_year: birth_year || null,
    avatar: '',
    avatar_public: false,
    generation,
    bound_user_id: null,
    created_by: openid,
    created_at: now,
    updated_at: now
  }

  const addRes = await db.collection('persons').add({ data: personData })
  const newPersonId = addRes._id

  // Create relationships only when a reference person is provided
  if (!isFirstMember) {
    const refRes2 = await db.collection('persons').doc(reference_person_id).get()
    const refPerson = refRes2.data

    // Create forward relationship: new person -> reference person
    const forwardRel = {
      family_id,
      from_id: newPersonId,
      to_id: reference_person_id,
      relation_type,
      created_at: now
    }
    await db.collection('relationships').add({ data: forwardRel })

    // Create reverse relationship: reference person -> new person
    const reverseMap = REVERSE_RELATION[relation_type]
    if (reverseMap) {
      const reverseType = reverseMap[refPerson.gender] || reverseMap.male
      const reverseRel = {
        family_id,
        from_id: reference_person_id,
        to_id: newPersonId,
        relation_type: reverseType,
        created_at: now
      }
      await db.collection('relationships').add({ data: reverseRel })
    }

    // ── Infer additional edges ──────────────────────────────────

    // Rule 1: Sibling → inherit parent edges from reference person
    if (SIBLING_TYPES.includes(relation_type)) {
      // Find reference person's parents: edges where someone is FATHER/MOTHER of ref
      const parentEdges = await db.collection('relationships')
        .where({
          family_id,
          to_id: reference_person_id,
          relation_type: _.in(['FATHER', 'MOTHER'])
        })
        .get()

      for (const pe of parentEdges.data) {
        const parentId = pe.from_id
        const parentRelType = pe.relation_type  // FATHER or MOTHER

        // Check if edge already exists (parent → new person)
        const existing = await db.collection('relationships')
          .where({ family_id, from_id: parentId, to_id: newPersonId })
          .limit(1)
          .get()
        if (existing.data.length > 0) continue

        // parent → new person (FATHER/MOTHER)
        await db.collection('relationships').add({
          data: { family_id, from_id: parentId, to_id: newPersonId, relation_type: parentRelType, created_at: now }
        })

        // new person → parent (SON/DAUGHTER based on new person's gender)
        const childType = gender === 'female' ? 'DAUGHTER' : 'SON'
        await db.collection('relationships').add({
          data: { family_id, from_id: newPersonId, to_id: parentId, relation_type: childType, created_at: now }
        })
      }
    }

    // Rule 2: Child → inherit parent edge from reference person's spouse
    if (CHILD_TYPES.includes(relation_type)) {
      // Find reference person's spouses
      const spouseEdges = await db.collection('relationships')
        .where({
          family_id,
          from_id: reference_person_id,
          relation_type: _.in(SPOUSE_TYPES)
        })
        .get()

      for (const se of spouseEdges.data) {
        const spouseId = se.to_id

        // Check if edge already exists (spouse → new person)
        const existing = await db.collection('relationships')
          .where({ family_id, from_id: spouseId, to_id: newPersonId })
          .limit(1)
          .get()
        if (existing.data.length > 0) continue

        // Get spouse's person record for gender
        const spouseRes = await db.collection('persons').doc(spouseId).get()
        const spouseGender = spouseRes.data.gender

        // spouse → new person (FATHER/MOTHER based on spouse gender)
        const parentType = spouseGender === 'female' ? 'MOTHER' : 'FATHER'
        await db.collection('relationships').add({
          data: { family_id, from_id: spouseId, to_id: newPersonId, relation_type: parentType, created_at: now }
        })

        // new person → spouse (SON/DAUGHTER)
        await db.collection('relationships').add({
          data: { family_id, from_id: newPersonId, to_id: spouseId, relation_type: relation_type, created_at: now }
        })
      }

      // Rule 6: Child → inherit sibling edges from reference person's other children
      // Find ref's other children: edges where someone is SON/DAUGHTER of ref
      const otherChildEdges = await db.collection('relationships')
        .where({
          family_id,
          to_id: reference_person_id,
          relation_type: _.in(CHILD_TYPES)
        })
        .get()

      for (const ce of otherChildEdges.data) {
        const otherChildId = ce.from_id
        if (otherChildId === newPersonId) continue

        const existing = await db.collection('relationships')
          .where({ family_id, from_id: newPersonId, to_id: otherChildId })
          .limit(1)
          .get()
        if (existing.data.length > 0) continue

        // Get the other child's person record for gender
        const otherChildRes = await db.collection('persons').doc(otherChildId).get()
        const otherChildGender = otherChildRes.data.gender

        // new child is younger sibling of existing child
        const newToOther = otherChildGender === 'female' ? 'OLDER_SISTER' : 'OLDER_BROTHER'
        const otherToNew = gender === 'female' ? 'YOUNGER_SISTER' : 'YOUNGER_BROTHER'

        await db.collection('relationships').add({
          data: { family_id, from_id: newPersonId, to_id: otherChildId, relation_type: newToOther, created_at: now }
        })
        await db.collection('relationships').add({
          data: { family_id, from_id: otherChildId, to_id: newPersonId, relation_type: otherToNew, created_at: now }
        })
      }
    }

    // Rule 3: Parent → inherit child edges from reference person's siblings
    if (PARENT_TYPES.includes(relation_type)) {
      const siblingEdges = await db.collection('relationships')
        .where({
          family_id,
          from_id: reference_person_id,
          relation_type: _.in(SIBLING_TYPES)
        })
        .get()

      for (const se of siblingEdges.data) {
        const siblingId = se.to_id

        const existing = await db.collection('relationships')
          .where({ family_id, from_id: newPersonId, to_id: siblingId })
          .limit(1)
          .get()
        if (existing.data.length > 0) continue

        // Get sibling's person record for gender
        const siblingRes = await db.collection('persons').doc(siblingId).get()
        const siblingGender = siblingRes.data.gender

        // new parent → sibling (FATHER/MOTHER same as relation_type)
        await db.collection('relationships').add({
          data: { family_id, from_id: newPersonId, to_id: siblingId, relation_type: relation_type, created_at: now }
        })

        // sibling → new parent (SON/DAUGHTER based on sibling gender)
        const childType = siblingGender === 'female' ? 'DAUGHTER' : 'SON'
        await db.collection('relationships').add({
          data: { family_id, from_id: siblingId, to_id: newPersonId, relation_type: childType, created_at: now }
        })
      }

      // Rule 4: Parent → inherit spouse edge from reference person's other parent
      const otherParentEdges = await db.collection('relationships')
        .where({
          family_id,
          to_id: reference_person_id,
          relation_type: _.in(PARENT_TYPES)
        })
        .get()

      for (const pe of otherParentEdges.data) {
        const otherParentId = pe.from_id
        if (otherParentId === newPersonId) continue

        const existing = await db.collection('relationships')
          .where({ family_id, from_id: newPersonId, to_id: otherParentId })
          .limit(1)
          .get()
        if (existing.data.length > 0) continue

        // Determine spouse type based on new person's gender
        const spouseType = gender === 'male' ? 'HUSBAND' : 'WIFE'
        const reverseSpouseType = gender === 'male' ? 'WIFE' : 'HUSBAND'

        await db.collection('relationships').add({
          data: { family_id, from_id: newPersonId, to_id: otherParentId, relation_type: spouseType, created_at: now }
        })
        await db.collection('relationships').add({
          data: { family_id, from_id: otherParentId, to_id: newPersonId, relation_type: reverseSpouseType, created_at: now }
        })
      }
    }

    // Rule 5: Sibling → inherit sibling edges from reference person's other siblings
    if (SIBLING_TYPES.includes(relation_type)) {
      const otherSiblingEdges = await db.collection('relationships')
        .where({
          family_id,
          from_id: reference_person_id,
          relation_type: _.in(SIBLING_TYPES)
        })
        .get()

      for (const se of otherSiblingEdges.data) {
        const otherSiblingId = se.to_id
        if (otherSiblingId === newPersonId) continue

        const existing = await db.collection('relationships')
          .where({ family_id, from_id: newPersonId, to_id: otherSiblingId })
          .limit(1)
          .get()
        if (existing.data.length > 0) continue

        // Get the other sibling's person record for gender
        const otherRes = await db.collection('persons').doc(otherSiblingId).get()
        const otherGender = otherRes.data.gender

        // Use REVERSE_RELATION to determine sibling type
        // New person views other sibling same way ref views them
        const newToOther = se.relation_type
        const reverseMap = REVERSE_RELATION[newToOther]
        const otherToNew = reverseMap ? (reverseMap[gender] || reverseMap.male) : 'YOUNGER_BROTHER'

        await db.collection('relationships').add({
          data: { family_id, from_id: newPersonId, to_id: otherSiblingId, relation_type: newToOther, created_at: now }
        })
        await db.collection('relationships').add({
          data: { family_id, from_id: otherSiblingId, to_id: newPersonId, relation_type: otherToNew, created_at: now }
        })
      }
    }

    // Rule 7: Spouse → inherit child edges from reference person's children
    if (SPOUSE_TYPES.includes(relation_type)) {
      // Find ref's children: edges where someone is SON/DAUGHTER of ref
      const childEdges = await db.collection('relationships')
        .where({
          family_id,
          to_id: reference_person_id,
          relation_type: _.in(CHILD_TYPES)
        })
        .get()

      for (const ce of childEdges.data) {
        const childId = ce.from_id

        const existing = await db.collection('relationships')
          .where({ family_id, from_id: newPersonId, to_id: childId })
          .limit(1)
          .get()
        if (existing.data.length > 0) continue

        // Get child's person record for gender
        const childRes = await db.collection('persons').doc(childId).get()
        const childGender = childRes.data.gender

        // new spouse → child (FATHER/MOTHER based on new person's gender)
        const parentType = gender === 'female' ? 'MOTHER' : 'FATHER'
        await db.collection('relationships').add({
          data: { family_id, from_id: newPersonId, to_id: childId, relation_type: parentType, created_at: now }
        })

        // child → new spouse (SON/DAUGHTER based on child gender)
        const childType = childGender === 'female' ? 'DAUGHTER' : 'SON'
        await db.collection('relationships').add({
          data: { family_id, from_id: childId, to_id: newPersonId, relation_type: childType, created_at: now }
        })
      }
    }
  }

  // Increment family member_count
  await db.collection('families').doc(family_id).update({
    data: { member_count: _.inc(1), updated_at: now }
  })

  // Create edit_history record
  await db.collection('edit_history').add({
    data: {
      family_id,
      person_id: newPersonId,
      action: 'create',
      operator_id: openid,
      snapshot_before: null,
      field_changes: null,
      created_at: now
    }
  })

  return success({ person_id: newPersonId })
}

// ────────────────────────────────────────
// update — 更新共享字段
// ────────────────────────────────────────
async function update(params) {
  const { person_id, family_id, ...fields } = params

  if (!person_id || !family_id) {
    return fail('缺少 person_id 或 family_id')
  }

  const openid = getOpenId()
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) return fail('您不是该家庭的成员')

  // Fetch existing person
  const personRes = await db.collection('persons').doc(person_id).get()
  const person = personRes.data
  if (!person || person.family_id !== family_id) {
    return fail('成员不存在或不属于该家庭')
  }

  // Restricted users can only update their own bound person
  if (membership.role === 'restricted') {
    if (person.bound_user_id !== openid) {
      return fail('Restricted 用户只能修改自己绑定的成员')
    }
  }

  // Filter to shared fields only — ignore private overlay fields
  const updateData = {}
  for (const key of SHARED_FIELDS) {
    if (key in fields && key !== 'generation') {
      // generation is computed, not directly editable
      updateData[key] = fields[key]
    }
  }

  // Handle avatar_public: only bound user or owner can modify
  if ('avatar_public' in fields) {
    const isSelf = person.bound_user_id === openid
    const isOwner = membership.role === 'owner'
    if (isSelf || isOwner) {
      updateData.avatar_public = !!fields.avatar_public
    }
  }

  if (Object.keys(updateData).length === 0) {
    return fail('没有可更新的共享字段')
  }

  // Build snapshot_before from current shared fields
  const snapshotBefore = {}
  for (const key of SHARED_FIELDS) {
    snapshotBefore[key] = person[key] !== undefined ? person[key] : null
  }

  // Build field_changes
  const fieldChanges = {}
  for (const key of Object.keys(updateData)) {
    fieldChanges[key] = { old: person[key] !== undefined ? person[key] : null, new: updateData[key] }
  }

  const now = db.serverDate()

  // Create edit_history snapshot before update
  await db.collection('edit_history').add({
    data: {
      family_id,
      person_id,
      action: 'update',
      operator_id: openid,
      snapshot_before: snapshotBefore,
      field_changes: fieldChanges,
      created_at: now
    }
  })

  // Apply update
  updateData.updated_at = now
  await db.collection('persons').doc(person_id).update({ data: updateData })

  return success()
}

// ────────────────────────────────────────
// delete — 级联删除成员
// ────────────────────────────────────────
async function del(params) {
  const { person_id, family_id } = params

  if (!person_id || !family_id) {
    return fail('缺少 person_id 或 family_id')
  }

  const openid = getOpenId()
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) return fail('您不是该家庭的成员')
  if (!hasPermission(membership.role, 'member')) {
    return fail('Restricted 用户无权删除成员')
  }

  // Fetch person for snapshot
  const personRes = await db.collection('persons').doc(person_id).get()
  const person = personRes.data
  if (!person || person.family_id !== family_id) {
    return fail('成员不存在或不属于该家庭')
  }

  // Cannot delete yourself (bound person)
  if (person.bound_user_id === openid) {
    return fail('不能删除自己')
  }

  // Permission check:
  // - Owner can delete anyone (except self, checked above)
  // - Member can only delete persons they created
  const isOwner = membership.role === 'owner'
  if (!isOwner) {
    // For legacy records without created_by, only owner can delete
    if (!person.created_by || person.created_by !== openid) {
      return fail('只能删除自己创建的成员')
    }
  }

  // Build snapshot_before
  const snapshotBefore = {}
  for (const key of SHARED_FIELDS) {
    snapshotBefore[key] = person[key] !== undefined ? person[key] : null
  }

  const now = db.serverDate()

  // Create edit_history with action 'delete'
  await db.collection('edit_history').add({
    data: {
      family_id,
      person_id,
      action: 'delete',
      operator_id: openid,
      snapshot_before: snapshotBefore,
      field_changes: null,
      created_at: now
    }
  })

  // Cascade deletes (run in parallel where possible)
  await Promise.all([
    // Delete all relationships involving this person (from or to)
    db.collection('relationships')
      .where({ family_id, from_id: person_id })
      .remove(),
    db.collection('relationships')
      .where({ family_id, to_id: person_id })
      .remove(),
    // Delete all photos with person_id matching
    db.collection('photos')
      .where({ person_id })
      .remove(),
    // Delete all photo_tags for this person
    db.collection('photo_tags')
      .where({ person_id })
      .remove(),
    // Delete all person_notes for this person (from ALL users)
    db.collection('person_notes')
      .where({ person_id })
      .remove()
  ])

  // Delete the person record
  await db.collection('persons').doc(person_id).remove()

  // Decrement family member_count
  await db.collection('families').doc(family_id).update({
    data: { member_count: _.inc(-1), updated_at: now }
  })

  return success()
}

// ────────────────────────────────────────
// getDetail — 共享层 + 私人覆盖层合并
// ────────────────────────────────────────
async function getDetail(params) {
  const { person_id, family_id } = params

  if (!person_id || !family_id) {
    return fail('缺少 person_id 或 family_id')
  }

  const openid = getOpenId()
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) return fail('您不是该家庭的成员')

  // Fetch person record (shared fields)
  const personRes = await db.collection('persons').doc(person_id).get()
  const person = personRes.data
  if (!person || person.family_id !== family_id) {
    return fail('成员不存在或不属于该家庭')
  }

  // Build response with shared fields
  const result = { _id: person._id }
  for (const key of SHARED_FIELDS) {
    result[key] = person[key] !== undefined ? person[key] : null
  }
  result.bound_user_id = person.bound_user_id || null
  result.avatar_public = !!person.avatar_public

  // Filter avatar visibility:
  // - Bound user (self) and owner always see avatar
  // - Others only if avatar_public is true
  const isSelf = person.bound_user_id === openid
  const isOwner = membership.role === 'owner'
  if (!isSelf && !isOwner && !person.avatar_public) {
    result.avatar = ''
  }

  // Compute delete permission for the caller
  // Owner can delete anyone except self; Member can delete persons they created (except self)
  const isCreator = !!person.created_by && person.created_by === openid
  const hasDeleteRole = isOwner || (hasPermission(membership.role, 'member') && isCreator)
  result._can_delete = !isSelf && hasDeleteRole

  // Get caller's private overlay (person_notes)
  const noteRes = await db.collection('person_notes')
    .where({ user_id: openid, person_id })
    .limit(1)
    .get()

  if (noteRes.data.length > 0) {
    const note = noteRes.data[0]
    for (const key of PRIVATE_OVERLAY_FIELDS) {
      if (note[key] !== undefined && note[key] !== null && note[key] !== '') {
        let value = note[key]
        // Decrypt encrypted fields before returning
        if (ENCRYPTED_FIELDS.includes(key)) {
          try {
            value = decrypt(value)
          } catch (e) {
            console.warn(`解密字段 ${key} 失败`, e.message)
          }
        }
        result[key] = value
        result[`${key}_source`] = 'my_note'
      }
    }
    // 惰性迁移：旧 remark 字符串 → remarks 数组
    if (typeof note.remark === 'string' && note.remark && !result.remarks) {
      result.remarks = [note.remark]
      result.remarks_source = 'my_note'
    }
    if (!Array.isArray(result.remarks)) {
      result.remarks = []
    }
  }

  return success(result)
}

// ────────────────────────────────────────
// list — 列出家庭所有成员
// ────────────────────────────────────────
async function list(params) {
  const { family_id } = params

  if (!family_id) {
    return fail('缺少 family_id')
  }

  const openid = getOpenId()
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) return fail('您不是该家庭的成员')

  // Get all persons in family
  const personsRes = await db.collection('persons')
    .where({ family_id })
    .get()
  const persons = personsRes.data

  if (persons.length === 0) {
    return success([])
  }

  // Batch get person_notes for current user to attach custom_title
  const personIds = persons.map(p => p._id)
  const notesRes = await db.collection('person_notes')
    .where({
      user_id: openid,
      person_id: _.in(personIds)
    })
    .get()

  // Build lookup map: person_id -> custom_title
  const noteMap = {}
  for (const note of notesRes.data) {
    if (note.custom_title) {
      noteMap[note.person_id] = note.custom_title
    }
  }

  // Assemble result with avatar privacy filtering
  const isOwner = membership.role === 'owner'
  const result = persons.map(p => {
    const isSelf = p.bound_user_id === openid
    const avatarVisible = isSelf || isOwner || !!p.avatar_public
    return {
      _id: p._id,
      name: p.name,
      gender: p.gender,
      birth_year: p.birth_year || null,
      is_deceased: p.is_deceased || false,  // kept for backward compat, no longer actively written
      avatar: avatarVisible ? (p.avatar || '') : '',
      avatar_public: !!p.avatar_public,
      generation: p.generation !== undefined ? p.generation : null,
      bound_user_id: p.bound_user_id || null,
      custom_title: noteMap[p._id] || null
    }
  })

  return success(result)
}
