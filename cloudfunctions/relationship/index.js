/**
 * 亲属关系云函数 —— 管理家庭中的关系边与称谓计算
 *
 * actions:
 *   create       — 创建一条有向关系边（自动生成反向边）
 *   delete       — 删除关系边及其反向边
 *   computeTitle — BFS 最短路径 + 称谓查表
 *   getGraph     — 获取家庭图谱全部节点、边和称谓
 */

const cloud = require('wx-server-sdk')
const { success, fail, checkMembership, hasPermission } = require('../utils/helpers')
const { RELATION_TYPES, REVERSE_RELATION, BFS_MAX_DEPTH } = require('../utils/constants')
const FORMAL_TITLE_MAP = require('../utils/titleMap')

cloud.init({ env: process.env.CLOUD_ENV || null })
const db = cloud.database()
const _ = db.command

// ---------------------------------------------------------------------------
// action: create — 创建关系边（正向 + 反向）
// ---------------------------------------------------------------------------
async function handleCreate(openid, { family_id, from_id, to_id, relation_type }) {
  // 参数校验
  if (!family_id || !from_id || !to_id || !relation_type) {
    return fail('缺少必填参数 (family_id, from_id, to_id, relation_type)')
  }

  if (from_id === to_id) {
    return fail('不能创建指向自身的关系')
  }

  if (!RELATION_TYPES.includes(relation_type)) {
    return fail(`无效的关系类型: ${relation_type}`)
  }

  // 权限校验：需要 owner 或 member 角色
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) {
    return fail('您不是该家庭成员', -3)
  }
  if (!hasPermission(membership.role, 'member')) {
    return fail('权限不足，需要成员或管理员角色', -4)
  }

  // 校验两个人物均存在于该家庭中
  const [fromPersonRes, toPersonRes] = await Promise.all([
    db.collection('persons').doc(from_id).get().catch(() => null),
    db.collection('persons').doc(to_id).get().catch(() => null)
  ])

  if (!fromPersonRes || !fromPersonRes.data) {
    return fail('起始人物不存在')
  }
  if (!toPersonRes || !toPersonRes.data) {
    return fail('目标人物不存在')
  }

  const fromPerson = fromPersonRes.data
  const toPerson = toPersonRes.data

  if (fromPerson.family_id !== family_id) {
    return fail('起始人物不属于该家庭')
  }
  if (toPerson.family_id !== family_id) {
    return fail('目标人物不属于该家庭')
  }

  // 确定反向关系类型 —— 基于目标人物（to）的性别
  // 反向边的含义：to 对于 from 来说是什么关系
  // 所以需要用 to 的性别来查 REVERSE_RELATION
  const toGender = toPerson.gender // 'male' | 'female'
  const reverseMapping = REVERSE_RELATION[relation_type]
  if (!reverseMapping) {
    return fail(`无法确定 ${relation_type} 的反向关系`)
  }
  const reverseType = reverseMapping[toGender]
  if (!reverseType) {
    return fail(`无法确定性别为 ${toGender} 的反向关系类型`)
  }

  const now = db.serverDate()

  // 创建正向边
  const forwardEdge = {
    family_id,
    from_id,
    to_id,
    relation_type,
    created_at: now
  }

  // 创建反向边
  const reverseEdge = {
    family_id,
    from_id: to_id,
    to_id: from_id,
    relation_type: reverseType,
    created_at: now
  }

  const [forwardRes, reverseRes] = await Promise.all([
    db.collection('relationships').add({ data: forwardEdge }),
    db.collection('relationships').add({ data: reverseEdge })
  ])

  return success({
    forward: { _id: forwardRes._id, ...forwardEdge },
    reverse: { _id: reverseRes._id, ...reverseEdge }
  })
}

// ---------------------------------------------------------------------------
// action: delete — 删除关系边及其反向边
// ---------------------------------------------------------------------------
async function handleDelete(openid, { relationship_id, family_id }) {
  if (!relationship_id || !family_id) {
    return fail('缺少必填参数 (relationship_id, family_id)')
  }

  // 权限校验
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) {
    return fail('您不是该家庭成员', -3)
  }
  if (!hasPermission(membership.role, 'member')) {
    return fail('权限不足，需要成员或管理员角色', -4)
  }

  // 查找原始关系记录
  let relRes
  try {
    relRes = await db.collection('relationships').doc(relationship_id).get()
  } catch (e) {
    return fail('关系记录不存在')
  }

  const rel = relRes.data
  if (rel.family_id !== family_id) {
    return fail('关系记录不属于该家庭')
  }

  // 查找反向边：from_id 和 to_id 互换，同一家庭
  const reverseRes = await db.collection('relationships')
    .where({
      family_id,
      from_id: rel.to_id,
      to_id: rel.from_id
    })
    .limit(1)
    .get()

  // 删除正向边
  await db.collection('relationships').doc(relationship_id).remove()

  // 删除反向边（如果存在）
  if (reverseRes.data.length > 0) {
    await db.collection('relationships').doc(reverseRes.data[0]._id).remove()
  }

  return success({
    deleted_forward: relationship_id,
    deleted_reverse: reverseRes.data.length > 0 ? reverseRes.data[0]._id : null
  })
}

// ---------------------------------------------------------------------------
// action: computeTitle — BFS 最短路径 + 称谓查表
// ---------------------------------------------------------------------------
async function handleComputeTitle(openid, { family_id, from_person_id, to_person_id }) {
  if (!family_id || !from_person_id || !to_person_id) {
    return fail('缺少必填参数 (family_id, from_person_id, to_person_id)')
  }

  if (from_person_id === to_person_id) {
    return success({ title: '本人', path_key: null })
  }

  // 加载该家庭所有关系边
  const { data: edges } = await db.collection('relationships')
    .where({ family_id })
    .get()

  // 查找目标人物以获取性别
  let targetPerson
  try {
    const res = await db.collection('persons').doc(to_person_id).get()
    targetPerson = res.data
  } catch (e) {
    return fail('目标人物不存在')
  }

  // 构建邻接表
  const adjacency = {}
  for (const edge of edges) {
    if (!adjacency[edge.from_id]) {
      adjacency[edge.from_id] = []
    }
    adjacency[edge.from_id].push({
      to_id: edge.to_id,
      relation_type: edge.relation_type
    })
  }

  // BFS 搜索最短路径
  const title = bfsComputeTitle(adjacency, from_person_id, to_person_id, targetPerson.gender)

  return success({ title })
}

/**
 * BFS 从 startId 到 endId，返回称谓字符串
 */
function bfsComputeTitle(adjacency, startId, endId, targetGender) {
  const visited = new Set()
  // 队列元素: { personId, path: [relation_type, ...] }
  const queue = [{ personId: startId, path: [] }]
  visited.add(startId)

  while (queue.length > 0) {
    const { personId, path } = queue.shift()

    // 超过最大深度则跳过
    if (path.length >= BFS_MAX_DEPTH) {
      continue
    }

    const neighbors = adjacency[personId] || []
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to_id)) {
        continue
      }

      const newPath = [...path, neighbor.relation_type]

      // 找到目标
      if (neighbor.to_id === endId) {
        const pathKey = newPath.join('>') + '|' + targetGender
        return FORMAL_TITLE_MAP[pathKey] || '亲属'
      }

      visited.add(neighbor.to_id)
      queue.push({ personId: neighbor.to_id, path: newPath })
    }
  }

  // 无法在限定深度内找到路径
  return '亲属'
}

// ---------------------------------------------------------------------------
// action: getGraph — 获取家庭图谱数据（节点 + 边 + 称谓）
// ---------------------------------------------------------------------------
async function handleGetGraph(openid, { family_id }) {
  if (!family_id) {
    return fail('缺少必填参数 (family_id)')
  }

  // 权限校验
  const membership = await checkMembership(db, openid, family_id)
  if (!membership) {
    return fail('您不是该家庭成员', -3)
  }

  // 并行获取人物、关系边和当前用户的个人备注
  const [personsRes, edgesRes, notesRes] = await Promise.all([
    db.collection('persons')
      .where({ family_id })
      .field({ _id: true, name: true, gender: true, generation: true, avatar: true, bound_user_id: true })
      .get(),
    db.collection('relationships')
      .where({ family_id })
      .get(),
    db.collection('person_notes')
      .where({ family_id, user_id: openid })
      .field({ person_id: true, custom_title: true })
      .get()
  ])

  const nodes = personsRes.data
  const edges = edgesRes.data
  const notes = notesRes.data

  // 构建备注映射: personId -> custom_title
  const customTitleMap = {}
  for (const note of notes) {
    if (note.custom_title) {
      customTitleMap[note.person_id] = note.custom_title
    }
  }

  // 找到当前用户绑定的人物
  const myPerson = nodes.find(n => n.bound_user_id === openid)

  // 计算称谓
  const titles = {}

  if (myPerson) {
    // 构建邻接表
    const adjacency = {}
    for (const edge of edges) {
      if (!adjacency[edge.from_id]) {
        adjacency[edge.from_id] = []
      }
      adjacency[edge.from_id].push({
        to_id: edge.to_id,
        relation_type: edge.relation_type
      })
    }

    // 为每个人物计算 BFS 称谓
    for (const node of nodes) {
      if (node._id === myPerson._id) {
        titles[node._id] = {
          formal_title: '本人',
          custom_title: customTitleMap[node._id] || null
        }
        continue
      }

      const formalTitle = bfsComputeTitle(adjacency, myPerson._id, node._id, node.gender)
      titles[node._id] = {
        formal_title: formalTitle,
        custom_title: customTitleMap[node._id] || null
      }
    }
  } else {
    // 当前用户未绑定人物，只填入自定义称谓
    for (const node of nodes) {
      titles[node._id] = {
        formal_title: null,
        custom_title: customTitleMap[node._id] || null
      }
    }
  }

  return success({ nodes, edges, titles })
}

// ---------------------------------------------------------------------------
// 入口 / 路由
// ---------------------------------------------------------------------------
exports.main = async (event, context) => {
  const { action, ...params } = event

  // 获取调用者 openid
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return fail('无法获取用户身份')
  }

  switch (action) {
    case 'create':
      return handleCreate(OPENID, params)
    case 'delete':
      return handleDelete(OPENID, params)
    case 'computeTitle':
      return handleComputeTitle(OPENID, params)
    case 'getGraph':
      return handleGetGraph(OPENID, params)
    default:
      return fail(`未知的 action: ${action}`)
  }
}
