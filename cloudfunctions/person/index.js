const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { getOpenId, success, fail, checkMembership, hasPermission } = require('./utils/helpers')
const {
  SHARED_FIELDS, PRIVATE_OVERLAY_FIELDS, ENCRYPTED_FIELDS,
  REVERSE_RELATION, GENERATION_DELTA, RELATION_TYPES
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
    is_deceased = false,
    reference_person_id, relation_type
  } = params

  if (!family_id || !name || !gender || !reference_person_id || !relation_type) {
    return fail('缺少必填参数')
  }

  if (!RELATION_TYPES.includes(relation_type)) {
    return fail(`无效的关系类型: ${relation_type}`)
  }

  const openid = getOpenId()
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) return fail('您不是该家庭的成员')
  if (!hasPermission(membership.role, 'member')) {
    return fail('Restricted 用户无权创建成员')
  }

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
  // New person IS relation_type OF reference person.
  // E.g. new person is FATHER of reference => new person's generation = reference.generation + delta(FATHER) = ref - 1
  const generation = (refPerson.generation || 0) + delta

  const now = db.serverDate()

  // Create person record
  const personData = {
    family_id,
    name,
    gender,
    birth_year: birth_year || null,
    is_deceased,
    avatar: '',
    generation,
    bound_user_id: null,
    created_at: now,
    updated_at: now
  }

  const addRes = await db.collection('persons').add({ data: personData })
  const newPersonId = addRes._id

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
// delete — Owner 级联删除
// ────────────────────────────────────────
async function del(params) {
  const { person_id, family_id } = params

  if (!person_id || !family_id) {
    return fail('缺少 person_id 或 family_id')
  }

  const openid = getOpenId()
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) return fail('您不是该家庭的成员')
  if (!hasPermission(membership.role, 'owner')) {
    return fail('仅 Owner 可删除成员')
  }

  // Fetch person for snapshot
  const personRes = await db.collection('persons').doc(person_id).get()
  const person = personRes.data
  if (!person || person.family_id !== family_id) {
    return fail('成员不存在或不属于该家庭')
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

  // Assemble result
  const result = persons.map(p => ({
    _id: p._id,
    name: p.name,
    gender: p.gender,
    birth_year: p.birth_year || null,
    is_deceased: p.is_deceased || false,
    avatar: p.avatar || '',
    generation: p.generation !== undefined ? p.generation : null,
    bound_user_id: p.bound_user_id || null,
    custom_title: noteMap[p._id] || null
  }))

  return success(result)
}
