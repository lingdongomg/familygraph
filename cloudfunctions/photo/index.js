/**
 * 照片云函数 —— 处理照片上传、删除、列表与标记
 *
 * actions:
 *   upload    — 预上传检查与记录创建
 *   delete    — 删除照片、文件、标记，更新存储
 *   list      — 按人物或家庭列出照片
 *   addTag    — 在照片上添加人物标记
 *   removeTag — 移除照片上的人物标记
 */

const cloud = require('wx-server-sdk')
const { success, fail, checkMembership } = require('./utils/helpers')
const { STORAGE_QUOTA_BYTES, MAX_PHOTOS_PER_PERSON, ROLES } = require('./utils/constants')

cloud.init({ env: process.env.CLOUD_ENV || null })
const db = cloud.database()
const _ = db.command

// ---------------------------------------------------------------------------
// action: upload — 预上传检查与记录创建
// ---------------------------------------------------------------------------
async function handleUpload(openid, { family_id, person_id, file_size }) {
  if (!family_id || !person_id || !file_size) {
    return fail('缺少必填参数 (family_id, person_id, file_size)')
  }

  // 检查成员身份
  const member = await checkMembership(db, openid, family_id)
  if (!member) {
    return fail('您不是该家庭的成员', -2)
  }

  // Restricted 用户只能上传到自己绑定的 Person
  if (member.role === ROLES.RESTRICTED) {
    if (member.bound_person_id !== person_id) {
      return fail('受限成员只能上传到自己绑定的 Person')
    }
  }

  // 查询家庭信息以检查存储配额
  const { data: family } = await db.collection('families').doc(family_id).get()
  if (!family) {
    return fail('家庭不存在')
  }

  // 检查存储配额
  const storageUsed = family.storage_used_bytes || 0
  if (!family.storage_unlimited && storageUsed + file_size > STORAGE_QUOTA_BYTES) {
    return fail(
      `存储配额不足。已用 ${Math.round(storageUsed / 1024 / 1024)}MB / ${Math.round(STORAGE_QUOTA_BYTES / 1024 / 1024)}MB`,
      -3
    )
  }

  // 检查该 Person 的照片数量上限
  const { total: photoCount } = await db.collection('photos')
    .where({ family_id, person_id })
    .count()

  if (photoCount >= MAX_PHOTOS_PER_PERSON) {
    return fail(`该人物的照片已达 ${MAX_PHOTOS_PER_PERSON} 张上限`, -4)
  }

  // 创建照片记录
  const now = db.serverDate()
  const photoRecord = {
    family_id,
    person_id,
    uploader_id: openid,
    file_id: '',
    thumb_file_id: '',
    file_size,
    status: 'pending',
    created_at: now,
    updated_at: now
  }

  const { _id } = await db.collection('photos').add({ data: photoRecord })

  // 递增家庭存储用量
  await db.collection('families').doc(family_id).update({
    data: { storage_used_bytes: _.inc(file_size) }
  })

  // 返回记录 ID 和云存储上传路径
  const cloudPath = `photos/${family_id}/${_id}`

  return success({ photo_id: _id, cloud_path: cloudPath })
}

// ---------------------------------------------------------------------------
// action: delete — 删除照片、文件、标记，更新存储
// ---------------------------------------------------------------------------
async function handleDelete(openid, { photo_id, family_id }) {
  if (!photo_id || !family_id) {
    return fail('缺少必填参数 (photo_id, family_id)')
  }

  // 检查成员身份
  const member = await checkMembership(db, openid, family_id)
  if (!member) {
    return fail('您不是该家庭的成员', -2)
  }

  // 获取照片记录
  const { data: photo } = await db.collection('photos').doc(photo_id).get()
  if (!photo) {
    return fail('照片不存在')
  }
  if (photo.family_id !== family_id) {
    return fail('照片不属于该家庭')
  }

  // 权限检查：上传者或 Owner 可删除
  const isUploader = photo.uploader_id === openid
  const isOwner = member.role === ROLES.OWNER
  if (!isUploader && !isOwner) {
    return fail('无权删除该照片，只有上传者或 Owner 可删除')
  }

  // 删除云存储文件
  const fileIdsToDelete = []
  if (photo.file_id) fileIdsToDelete.push(photo.file_id)
  if (photo.thumb_file_id) fileIdsToDelete.push(photo.thumb_file_id)

  if (fileIdsToDelete.length > 0) {
    await cloud.deleteFile({ fileList: fileIdsToDelete })
  }

  // 删除该照片的所有标记
  const { data: tags } = await db.collection('photo_tags')
    .where({ photo_id })
    .get()

  const deleteTagPromises = tags.map(tag =>
    db.collection('photo_tags').doc(tag._id).remove()
  )
  await Promise.all(deleteTagPromises)

  // 删除照片记录
  await db.collection('photos').doc(photo_id).remove()

  // 扣减家庭存储用量
  await db.collection('families').doc(family_id).update({
    data: { storage_used_bytes: _.inc(-photo.file_size) }
  })

  return success({ deleted_photo_id: photo_id })
}

// ---------------------------------------------------------------------------
// action: list — 按人物或家庭列出照片
// ---------------------------------------------------------------------------
async function handleList(openid, { family_id, person_id, page }) {
  if (!family_id) {
    return fail('缺少必填参数 (family_id)')
  }

  // 检查成员身份
  const member = await checkMembership(db, openid, family_id)
  if (!member) {
    return fail('您不是该家庭的成员', -2)
  }

  const pageSize = 20

  if (person_id) {
    // 按 Person 查询照片，最多 20 张，按创建时间倒序
    const { data: photos } = await db.collection('photos')
      .where({ family_id, person_id })
      .orderBy('created_at', 'desc')
      .limit(MAX_PHOTOS_PER_PERSON)
      .get()

    return success({ photos })
  }

  // 按家庭查询全部照片，分页
  const currentPage = Math.max(1, page || 1)
  const skip = (currentPage - 1) * pageSize

  const { total } = await db.collection('photos')
    .where({ family_id })
    .count()

  const { data: photos } = await db.collection('photos')
    .where({ family_id })
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return success({
    photos,
    page: currentPage,
    page_size: pageSize,
    total
  })
}

// ---------------------------------------------------------------------------
// action: addTag — 在照片上添加人物标记
// ---------------------------------------------------------------------------
async function handleAddTag(openid, { photo_id, person_id, x, y }) {
  if (!photo_id || !person_id || x === undefined || y === undefined) {
    return fail('缺少必填参数 (photo_id, person_id, x, y)')
  }

  // 坐标范围校验
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return fail('标记坐标 x、y 须在 0-1 之间')
  }

  // 获取照片记录以确认家庭
  const { data: photo } = await db.collection('photos').doc(photo_id).get()
  if (!photo) {
    return fail('照片不存在')
  }

  // 检查成员身份
  const member = await checkMembership(db, openid, photo.family_id)
  if (!member) {
    return fail('您不是该家庭的成员', -2)
  }

  // 创建标记记录
  const now = db.serverDate()
  const tagRecord = {
    photo_id,
    person_id,
    x,
    y,
    tagged_by: openid,
    created_at: now
  }

  const { _id } = await db.collection('photo_tags').add({ data: tagRecord })

  return success({ tag_id: _id, ...tagRecord })
}

// ---------------------------------------------------------------------------
// action: removeTag — 移除照片上的人物标记
// ---------------------------------------------------------------------------
async function handleRemoveTag(openid, { tag_id }) {
  if (!tag_id) {
    return fail('缺少必填参数 (tag_id)')
  }

  // 获取标记记录
  const { data: tag } = await db.collection('photo_tags').doc(tag_id).get()
  if (!tag) {
    return fail('标记不存在')
  }

  // 获取照片记录以确认家庭
  const { data: photo } = await db.collection('photos').doc(tag.photo_id).get()
  if (!photo) {
    return fail('关联照片不存在')
  }

  // 检查成员身份
  const member = await checkMembership(db, openid, photo.family_id)
  if (!member) {
    return fail('您不是该家庭的成员', -2)
  }

  // 权限检查：标记者或 Owner 可移除
  const isTagger = tag.tagged_by === openid
  const isOwner = member.role === ROLES.OWNER
  if (!isTagger && !isOwner) {
    return fail('无权移除该标记，只有标记者或 Owner 可移除')
  }

  // 删除标记记录
  await db.collection('photo_tags').doc(tag_id).remove()

  return success({ deleted_tag_id: tag_id })
}

// ---------------------------------------------------------------------------
// action: detail — 获取照片详情及标记
// ---------------------------------------------------------------------------
async function handleDetail(openid, { photo_id, family_id }) {
  if (!photo_id) {
    return fail('缺少必填参数 (photo_id)')
  }

  // 获取照片记录
  const { data: photo } = await db.collection('photos').doc(photo_id).get()
  if (!photo) {
    return fail('照片不存在')
  }

  const photoFamilyId = family_id || photo.family_id

  // 检查成员身份
  const member = await checkMembership(db, openid, photoFamilyId)
  if (!member) {
    return fail('您不是该家庭的成员', -2)
  }

  // 获取该照片的所有标记
  const { data: tags } = await db.collection('photo_tags')
    .where({ photo_id })
    .get()

  // 为标记附加 person 姓名
  for (const tag of tags) {
    if (tag.person_id) {
      try {
        const pRes = await db.collection('persons').doc(tag.person_id)
          .field({ name: true })
          .get()
        tag.person_name = pRes.data.name || ''
      } catch (e) {
        tag.person_name = ''
      }
    }
  }

  return success({
    photo: {
      ...photo,
      owner_id: member.role === ROLES.OWNER ? openid : ''
    },
    tags
  })
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
    case 'upload':
      return handleUpload(OPENID, params)
    case 'delete':
      return handleDelete(OPENID, params)
    case 'list':
      return handleList(OPENID, params)
    case 'detail':
      return handleDetail(OPENID, params)
    case 'addTag':
      return handleAddTag(OPENID, params)
    case 'removeTag':
      return handleRemoveTag(OPENID, params)
    default:
      return fail(`未知的 action: ${action}`)
  }
}
