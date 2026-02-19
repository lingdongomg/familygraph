/**
 * 中文亲属称谓映射表 (FORMAL_TITLE_MAP)
 *
 * 路径键格式: "RELATION1>RELATION2>...|GENDER"
 *   - 路径从自己出发，沿关系边到达目标人物
 *   - GENDER 为目标人物的性别 (male / female)
 *
 * 关系类型: FATHER, MOTHER, SON, DAUGHTER, HUSBAND, WIFE,
 *           OLDER_BROTHER, YOUNGER_BROTHER, OLDER_SISTER, YOUNGER_SISTER
 *
 * 覆盖五代 (高祖辈 → 玄孙辈)，含直系、旁系、姻亲
 */

const FORMAL_TITLE_MAP = {

  // ============================================================
  //  第零层: 自身配偶
  // ============================================================
  'HUSBAND|male': '丈夫',
  'WIFE|female': '妻子',

  // ============================================================
  //  第一层: 父母 / 子女 / 兄弟姐妹
  // ============================================================

  // --- 父母 ---
  'FATHER|male': '父亲',
  'MOTHER|female': '母亲',

  // --- 子女 ---
  'SON|male': '儿子',
  'DAUGHTER|female': '女儿',

  // --- 兄弟姐妹 ---
  'OLDER_BROTHER|male': '哥哥',
  'YOUNGER_BROTHER|male': '弟弟',
  'OLDER_SISTER|female': '姐姐',
  'YOUNGER_SISTER|female': '妹妹',

  // ============================================================
  //  第二层: 祖父母 / 孙辈 / 叔伯姑舅姨 / 侄甥 / 配偶亲属
  // ============================================================

  // --- 祖父母 (父系) ---
  'FATHER>FATHER|male': '祖父',
  'FATHER>MOTHER|female': '祖母',

  // --- 外祖父母 (母系) ---
  'MOTHER>FATHER|male': '外祖父',
  'MOTHER>MOTHER|female': '外祖母',

  // --- 孙辈 ---
  'SON>SON|male': '孙子',
  'SON>DAUGHTER|female': '孙女',
  'DAUGHTER>SON|male': '外孙',
  'DAUGHTER>DAUGHTER|female': '外孙女',

  // --- 父亲的兄弟姐妹 (叔伯姑) ---
  'FATHER>OLDER_BROTHER|male': '伯父',
  'FATHER>YOUNGER_BROTHER|male': '叔父',
  'FATHER>OLDER_SISTER|female': '姑母',
  'FATHER>YOUNGER_SISTER|female': '姑母',

  // --- 母亲的兄弟姐妹 (舅姨) ---
  'MOTHER>OLDER_BROTHER|male': '舅父',
  'MOTHER>YOUNGER_BROTHER|male': '舅父',
  'MOTHER>OLDER_SISTER|female': '姨母',
  'MOTHER>YOUNGER_SISTER|female': '姨母',

  // --- 兄弟的子女 (侄) ---
  'OLDER_BROTHER>SON|male': '侄子',
  'OLDER_BROTHER>DAUGHTER|female': '侄女',
  'YOUNGER_BROTHER>SON|male': '侄子',
  'YOUNGER_BROTHER>DAUGHTER|female': '侄女',

  // --- 姐妹的子女 (外甥) ---
  'OLDER_SISTER>SON|male': '外甥',
  'OLDER_SISTER>DAUGHTER|female': '外甥女',
  'YOUNGER_SISTER>SON|male': '外甥',
  'YOUNGER_SISTER>DAUGHTER|female': '外甥女',

  // --- 子女的配偶 ---
  'SON>WIFE|female': '儿媳',
  'DAUGHTER>HUSBAND|male': '女婿',

  // --- 兄弟的配偶 ---
  'OLDER_BROTHER>WIFE|female': '嫂子',
  'YOUNGER_BROTHER>WIFE|female': '弟媳',

  // --- 姐妹的配偶 ---
  'OLDER_SISTER>HUSBAND|male': '姐夫',
  'YOUNGER_SISTER>HUSBAND|male': '妹夫',

  // --- 配偶的父母 (公婆 / 岳父母) ---
  'HUSBAND>FATHER|male': '公公',
  'HUSBAND>MOTHER|female': '婆婆',
  'WIFE>FATHER|male': '岳父',
  'WIFE>MOTHER|female': '岳母',

  // --- 配偶的兄弟姐妹 ---
  'HUSBAND>OLDER_BROTHER|male': '大伯子',
  'HUSBAND>YOUNGER_BROTHER|male': '小叔子',
  'HUSBAND>OLDER_SISTER|female': '大姑子',
  'HUSBAND>YOUNGER_SISTER|female': '小姑子',
  'WIFE>OLDER_BROTHER|male': '大舅子',
  'WIFE>YOUNGER_BROTHER|male': '小舅子',
  'WIFE>OLDER_SISTER|female': '大姨子',
  'WIFE>YOUNGER_SISTER|female': '小姨子',

  // ============================================================
  //  第三层: 曾祖 / 曾孙 / 堂表亲 / 姻亲延伸
  // ============================================================

  // --- 曾祖父母 (父系) ---
  'FATHER>FATHER>FATHER|male': '曾祖父',
  'FATHER>FATHER>MOTHER|female': '曾祖母',

  // --- 外曾祖父母 (母系经父) ---
  'FATHER>MOTHER>FATHER|male': '外曾祖父',
  'FATHER>MOTHER>MOTHER|female': '外曾祖母',

  // --- 外曾祖父母 (母系) ---
  'MOTHER>FATHER>FATHER|male': '外曾祖父',
  'MOTHER>FATHER>MOTHER|female': '外曾祖母',
  'MOTHER>MOTHER>FATHER|male': '外曾祖父',
  'MOTHER>MOTHER>MOTHER|female': '外曾祖母',

  // --- 曾孙 ---
  'SON>SON>SON|male': '曾孙',
  'SON>SON>DAUGHTER|female': '曾孙女',
  'SON>DAUGHTER>SON|male': '外曾孙',
  'SON>DAUGHTER>DAUGHTER|female': '外曾孙女',
  'DAUGHTER>SON>SON|male': '外曾孙',
  'DAUGHTER>SON>DAUGHTER|female': '外曾孙女',
  'DAUGHTER>DAUGHTER>SON|male': '外曾孙',
  'DAUGHTER>DAUGHTER>DAUGHTER|female': '外曾孙女',

  // --- 堂兄弟姐妹 (父亲兄弟的子女) ---
  'FATHER>OLDER_BROTHER>SON|male': '堂兄',
  'FATHER>OLDER_BROTHER>DAUGHTER|female': '堂姐',
  'FATHER>YOUNGER_BROTHER>SON|male': '堂弟',
  'FATHER>YOUNGER_BROTHER>DAUGHTER|female': '堂妹',

  // --- 表兄弟姐妹 (父亲姐妹的子女) ---
  'FATHER>OLDER_SISTER>SON|male': '表兄',
  'FATHER>OLDER_SISTER>DAUGHTER|female': '表姐',
  'FATHER>YOUNGER_SISTER>SON|male': '表弟',
  'FATHER>YOUNGER_SISTER>DAUGHTER|female': '表妹',

  // --- 表兄弟姐妹 (母亲兄弟的子女) ---
  'MOTHER>OLDER_BROTHER>SON|male': '表兄',
  'MOTHER>OLDER_BROTHER>DAUGHTER|female': '表姐',
  'MOTHER>YOUNGER_BROTHER>SON|male': '表弟',
  'MOTHER>YOUNGER_BROTHER>DAUGHTER|female': '表妹',

  // --- 表兄弟姐妹 (母亲姐妹的子女) ---
  'MOTHER>OLDER_SISTER>SON|male': '表兄',
  'MOTHER>OLDER_SISTER>DAUGHTER|female': '表姐',
  'MOTHER>YOUNGER_SISTER>SON|male': '表弟',
  'MOTHER>YOUNGER_SISTER>DAUGHTER|female': '表妹',

  // --- 伯叔父的配偶 ---
  'FATHER>OLDER_BROTHER>WIFE|female': '伯母',
  'FATHER>YOUNGER_BROTHER>WIFE|female': '婶母',

  // --- 姑母的配偶 ---
  'FATHER>OLDER_SISTER>HUSBAND|male': '姑父',
  'FATHER>YOUNGER_SISTER>HUSBAND|male': '姑父',

  // --- 舅父的配偶 ---
  'MOTHER>OLDER_BROTHER>WIFE|female': '舅母',
  'MOTHER>YOUNGER_BROTHER>WIFE|female': '舅母',

  // --- 姨母的配偶 ---
  'MOTHER>OLDER_SISTER>HUSBAND|male': '姨父',
  'MOTHER>YOUNGER_SISTER>HUSBAND|male': '姨父',

  // --- 孙辈的配偶 ---
  'SON>SON>WIFE|female': '孙媳',
  'SON>DAUGHTER>HUSBAND|male': '孙女婿',
  'DAUGHTER>SON>WIFE|female': '外孙媳',
  'DAUGHTER>DAUGHTER>HUSBAND|male': '外孙女婿',

  // --- 侄子/侄女的配偶 ---
  'OLDER_BROTHER>SON>WIFE|female': '侄媳',
  'OLDER_BROTHER>DAUGHTER>HUSBAND|male': '侄女婿',
  'YOUNGER_BROTHER>SON>WIFE|female': '侄媳',
  'YOUNGER_BROTHER>DAUGHTER>HUSBAND|male': '侄女婿',

  // --- 外甥/外甥女的配偶 ---
  'OLDER_SISTER>SON>WIFE|female': '外甥媳',
  'OLDER_SISTER>DAUGHTER>HUSBAND|male': '外甥女婿',
  'YOUNGER_SISTER>SON>WIFE|female': '外甥媳',
  'YOUNGER_SISTER>DAUGHTER>HUSBAND|male': '外甥女婿',

  // --- 妯娌 (兄弟的妻子之间) ---
  'HUSBAND>OLDER_BROTHER>WIFE|female': '妯娌',
  'HUSBAND>YOUNGER_BROTHER>WIFE|female': '妯娌',

  // --- 连襟 (姐妹的丈夫之间) ---
  'WIFE>OLDER_SISTER>HUSBAND|male': '连襟',
  'WIFE>YOUNGER_SISTER>HUSBAND|male': '连襟',

  // --- 配偶的兄弟姐妹的配偶 ---
  'HUSBAND>OLDER_SISTER>HUSBAND|male': '姑父',     // 丈夫的姐姐的丈夫
  'HUSBAND>YOUNGER_SISTER>HUSBAND|male': '姑父',   // 丈夫的妹妹的丈夫
  'WIFE>OLDER_BROTHER>WIFE|female': '舅嫂',        // 妻子的哥哥的妻子
  'WIFE>YOUNGER_BROTHER>WIFE|female': '舅嫂',      // 妻子的弟弟的妻子

  // --- 祖父的兄弟 (伯祖/叔祖) ---
  'FATHER>FATHER>OLDER_BROTHER|male': '伯祖父',
  'FATHER>FATHER>YOUNGER_BROTHER|male': '叔祖父',
  'FATHER>FATHER>OLDER_SISTER|female': '祖姑母',
  'FATHER>FATHER>YOUNGER_SISTER|female': '祖姑母',

  // --- 祖母的兄弟姐妹 ---
  'FATHER>MOTHER>OLDER_BROTHER|male': '舅祖父',
  'FATHER>MOTHER>YOUNGER_BROTHER|male': '舅祖父',
  'FATHER>MOTHER>OLDER_SISTER|female': '姨祖母',
  'FATHER>MOTHER>YOUNGER_SISTER|female': '姨祖母',

  // --- 外祖父的兄弟姐妹 ---
  'MOTHER>FATHER>OLDER_BROTHER|male': '外伯祖父',
  'MOTHER>FATHER>YOUNGER_BROTHER|male': '外叔祖父',
  'MOTHER>FATHER>OLDER_SISTER|female': '外祖姑母',
  'MOTHER>FATHER>YOUNGER_SISTER|female': '外祖姑母',

  // --- 外祖母的兄弟姐妹 ---
  'MOTHER>MOTHER>OLDER_BROTHER|male': '外舅祖父',
  'MOTHER>MOTHER>YOUNGER_BROTHER|male': '外舅祖父',
  'MOTHER>MOTHER>OLDER_SISTER|female': '外姨祖母',
  'MOTHER>MOTHER>YOUNGER_SISTER|female': '外姨祖母',

  // --- 侄辈的子女 ---
  'OLDER_BROTHER>SON>SON|male': '侄孙',
  'OLDER_BROTHER>SON>DAUGHTER|female': '侄孙女',
  'YOUNGER_BROTHER>SON>SON|male': '侄孙',
  'YOUNGER_BROTHER>SON>DAUGHTER|female': '侄孙女',
  'OLDER_BROTHER>DAUGHTER>SON|male': '侄外孙',
  'OLDER_BROTHER>DAUGHTER>DAUGHTER|female': '侄外孙女',
  'YOUNGER_BROTHER>DAUGHTER>SON|male': '侄外孙',
  'YOUNGER_BROTHER>DAUGHTER>DAUGHTER|female': '侄外孙女',

  // --- 外甥辈的子女 ---
  'OLDER_SISTER>SON>SON|male': '外甥孙',
  'OLDER_SISTER>SON>DAUGHTER|female': '外甥孙女',
  'YOUNGER_SISTER>SON>SON|male': '外甥孙',
  'YOUNGER_SISTER>SON>DAUGHTER|female': '外甥孙女',

  // ============================================================
  //  第四层: 高祖 / 玄孙 / 族亲 / 堂表侄甥
  // ============================================================

  // --- 高祖父母 ---
  'FATHER>FATHER>FATHER>FATHER|male': '高祖父',
  'FATHER>FATHER>FATHER>MOTHER|female': '高祖母',

  // --- 外高祖父母 (多条路径) ---
  'FATHER>FATHER>MOTHER>FATHER|male': '外高祖父',
  'FATHER>FATHER>MOTHER>MOTHER|female': '外高祖母',
  'FATHER>MOTHER>FATHER>FATHER|male': '外高祖父',
  'FATHER>MOTHER>FATHER>MOTHER|female': '外高祖母',
  'FATHER>MOTHER>MOTHER>FATHER|male': '外高祖父',
  'FATHER>MOTHER>MOTHER>MOTHER|female': '外高祖母',
  'MOTHER>FATHER>FATHER>FATHER|male': '外高祖父',
  'MOTHER>FATHER>FATHER>MOTHER|female': '外高祖母',
  'MOTHER>FATHER>MOTHER>FATHER|male': '外高祖父',
  'MOTHER>FATHER>MOTHER>MOTHER|female': '外高祖母',
  'MOTHER>MOTHER>FATHER>FATHER|male': '外高祖父',
  'MOTHER>MOTHER>FATHER>MOTHER|female': '外高祖母',
  'MOTHER>MOTHER>MOTHER>FATHER|male': '外高祖父',
  'MOTHER>MOTHER>MOTHER>MOTHER|female': '外高祖母',

  // --- 玄孙 ---
  'SON>SON>SON>SON|male': '玄孙',
  'SON>SON>SON>DAUGHTER|female': '玄孙女',
  'SON>SON>DAUGHTER>SON|male': '外玄孙',
  'SON>SON>DAUGHTER>DAUGHTER|female': '外玄孙女',
  'SON>DAUGHTER>SON>SON|male': '外玄孙',
  'SON>DAUGHTER>SON>DAUGHTER|female': '外玄孙女',
  'SON>DAUGHTER>DAUGHTER>SON|male': '外玄孙',
  'SON>DAUGHTER>DAUGHTER>DAUGHTER|female': '外玄孙女',
  'DAUGHTER>SON>SON>SON|male': '外玄孙',
  'DAUGHTER>SON>SON>DAUGHTER|female': '外玄孙女',
  'DAUGHTER>SON>DAUGHTER>SON|male': '外玄孙',
  'DAUGHTER>SON>DAUGHTER>DAUGHTER|female': '外玄孙女',
  'DAUGHTER>DAUGHTER>SON>SON|male': '外玄孙',
  'DAUGHTER>DAUGHTER>SON>DAUGHTER|female': '外玄孙女',
  'DAUGHTER>DAUGHTER>DAUGHTER>SON|male': '外玄孙',
  'DAUGHTER>DAUGHTER>DAUGHTER>DAUGHTER|female': '外玄孙女',

  // --- 族兄弟姐妹 (祖父兄弟的孙辈) ---
  'FATHER>FATHER>OLDER_BROTHER>SON>SON|male': '族兄',
  'FATHER>FATHER>OLDER_BROTHER>SON>DAUGHTER|female': '族姐',
  'FATHER>FATHER>YOUNGER_BROTHER>SON>SON|male': '族弟',
  'FATHER>FATHER>YOUNGER_BROTHER>SON>DAUGHTER|female': '族妹',
  'FATHER>FATHER>OLDER_BROTHER>DAUGHTER>SON|male': '族兄',
  'FATHER>FATHER>OLDER_BROTHER>DAUGHTER>DAUGHTER|female': '族姐',
  'FATHER>FATHER>YOUNGER_BROTHER>DAUGHTER>SON|male': '族弟',
  'FATHER>FATHER>YOUNGER_BROTHER>DAUGHTER>DAUGHTER|female': '族妹',

  // --- 堂叔伯 (祖父兄弟的儿子) ---
  'FATHER>FATHER>OLDER_BROTHER>SON|male': '堂伯父',
  'FATHER>FATHER>YOUNGER_BROTHER>SON|male': '堂叔父',
  'FATHER>FATHER>OLDER_BROTHER>DAUGHTER|female': '堂姑母',
  'FATHER>FATHER>YOUNGER_BROTHER>DAUGHTER|female': '堂姑母',

  // --- 堂侄 (堂兄弟的子女) ---
  'FATHER>OLDER_BROTHER>SON>SON|male': '堂侄',
  'FATHER>OLDER_BROTHER>SON>DAUGHTER|female': '堂侄女',
  'FATHER>YOUNGER_BROTHER>SON>SON|male': '堂侄',
  'FATHER>YOUNGER_BROTHER>SON>DAUGHTER|female': '堂侄女',
  'FATHER>OLDER_BROTHER>DAUGHTER>SON|male': '堂外甥',
  'FATHER>OLDER_BROTHER>DAUGHTER>DAUGHTER|female': '堂外甥女',
  'FATHER>YOUNGER_BROTHER>DAUGHTER>SON|male': '堂外甥',
  'FATHER>YOUNGER_BROTHER>DAUGHTER>DAUGHTER|female': '堂外甥女',

  // --- 表侄 (表兄弟姐妹的子女, 经父亲姐妹) ---
  'FATHER>OLDER_SISTER>SON>SON|male': '表侄',
  'FATHER>OLDER_SISTER>SON>DAUGHTER|female': '表侄女',
  'FATHER>YOUNGER_SISTER>SON>SON|male': '表侄',
  'FATHER>YOUNGER_SISTER>SON>DAUGHTER|female': '表侄女',
  'FATHER>OLDER_SISTER>DAUGHTER>SON|male': '表外甥',
  'FATHER>OLDER_SISTER>DAUGHTER>DAUGHTER|female': '表外甥女',
  'FATHER>YOUNGER_SISTER>DAUGHTER>SON|male': '表外甥',
  'FATHER>YOUNGER_SISTER>DAUGHTER>DAUGHTER|female': '表外甥女',

  // --- 表侄 (表兄弟姐妹的子女, 经母亲兄弟) ---
  'MOTHER>OLDER_BROTHER>SON>SON|male': '表侄',
  'MOTHER>OLDER_BROTHER>SON>DAUGHTER|female': '表侄女',
  'MOTHER>YOUNGER_BROTHER>SON>SON|male': '表侄',
  'MOTHER>YOUNGER_BROTHER>SON>DAUGHTER|female': '表侄女',
  'MOTHER>OLDER_BROTHER>DAUGHTER>SON|male': '表外甥',
  'MOTHER>OLDER_BROTHER>DAUGHTER>DAUGHTER|female': '表外甥女',
  'MOTHER>YOUNGER_BROTHER>DAUGHTER>SON|male': '表外甥',
  'MOTHER>YOUNGER_BROTHER>DAUGHTER>DAUGHTER|female': '表外甥女',

  // --- 表侄 (表兄弟姐妹的子女, 经母亲姐妹) ---
  'MOTHER>OLDER_SISTER>SON>SON|male': '表侄',
  'MOTHER>OLDER_SISTER>SON>DAUGHTER|female': '表侄女',
  'MOTHER>YOUNGER_SISTER>SON>SON|male': '表侄',
  'MOTHER>YOUNGER_SISTER>SON>DAUGHTER|female': '表侄女',
  'MOTHER>OLDER_SISTER>DAUGHTER>SON|male': '表外甥',
  'MOTHER>OLDER_SISTER>DAUGHTER>DAUGHTER|female': '表外甥女',
  'MOTHER>YOUNGER_SISTER>DAUGHTER>SON|male': '表外甥',
  'MOTHER>YOUNGER_SISTER>DAUGHTER>DAUGHTER|female': '表外甥女',

  // --- 曾祖父的兄弟 (曾伯祖 / 曾叔祖) ---
  'FATHER>FATHER>FATHER>OLDER_BROTHER|male': '曾伯祖父',
  'FATHER>FATHER>FATHER>YOUNGER_BROTHER|male': '曾叔祖父',
  'FATHER>FATHER>FATHER>OLDER_SISTER|female': '曾祖姑母',
  'FATHER>FATHER>FATHER>YOUNGER_SISTER|female': '曾祖姑母',

  // --- 伯叔祖父的配偶 ---
  'FATHER>FATHER>OLDER_BROTHER>WIFE|female': '伯祖母',
  'FATHER>FATHER>YOUNGER_BROTHER>WIFE|female': '叔祖母',

  // --- 祖姑母的配偶 ---
  'FATHER>FATHER>OLDER_SISTER>HUSBAND|male': '祖姑父',
  'FATHER>FATHER>YOUNGER_SISTER>HUSBAND|male': '祖姑父',

  // --- 曾孙辈的配偶 ---
  'SON>SON>SON>WIFE|female': '曾孙媳',
  'SON>SON>DAUGHTER>HUSBAND|male': '曾孙女婿',
  'DAUGHTER>SON>SON>WIFE|female': '外曾孙媳',
  'DAUGHTER>SON>DAUGHTER>HUSBAND|male': '外曾孙女婿',

  // --- 堂兄弟的配偶 ---
  'FATHER>OLDER_BROTHER>SON>WIFE|female': '堂嫂',
  'FATHER>YOUNGER_BROTHER>SON>WIFE|female': '堂弟媳',
  'FATHER>OLDER_BROTHER>DAUGHTER>HUSBAND|male': '堂姐夫',
  'FATHER>YOUNGER_BROTHER>DAUGHTER>HUSBAND|male': '堂妹夫',

  // --- 表兄弟的配偶 (经父亲姐妹) ---
  'FATHER>OLDER_SISTER>SON>WIFE|female': '表嫂',
  'FATHER>YOUNGER_SISTER>SON>WIFE|female': '表弟媳',
  'FATHER>OLDER_SISTER>DAUGHTER>HUSBAND|male': '表姐夫',
  'FATHER>YOUNGER_SISTER>DAUGHTER>HUSBAND|male': '表妹夫',

  // --- 表兄弟的配偶 (经母亲兄弟) ---
  'MOTHER>OLDER_BROTHER>SON>WIFE|female': '表嫂',
  'MOTHER>YOUNGER_BROTHER>SON>WIFE|female': '表弟媳',

  // --- 表兄弟的配偶 (经母亲姐妹) ---
  'MOTHER>OLDER_SISTER>SON>WIFE|female': '表嫂',
  'MOTHER>YOUNGER_SISTER>SON>WIFE|female': '表弟媳',

  // ============================================================
  //  第五层: 跨五代边（BFS_MAX_DEPTH = 5）
  // ============================================================

  // --- 高祖父的兄弟 ---
  'FATHER>FATHER>FATHER>FATHER>OLDER_BROTHER|male': '高伯祖父',
  'FATHER>FATHER>FATHER>FATHER>YOUNGER_BROTHER|male': '高叔祖父',
  'FATHER>FATHER>FATHER>FATHER>OLDER_SISTER|female': '高祖姑母',
  'FATHER>FATHER>FATHER>FATHER>YOUNGER_SISTER|female': '高祖姑母',

  // --- 曾伯叔祖父的儿子 (族祖父) ---
  'FATHER>FATHER>FATHER>OLDER_BROTHER>SON|male': '族伯祖父',
  'FATHER>FATHER>FATHER>YOUNGER_BROTHER>SON|male': '族叔祖父',
  'FATHER>FATHER>FATHER>OLDER_BROTHER>DAUGHTER|female': '族祖姑母',
  'FATHER>FATHER>FATHER>YOUNGER_BROTHER>DAUGHTER|female': '族祖姑母',

  // --- 伯叔祖父的孙子 (族伯/族叔) ---
  'FATHER>FATHER>OLDER_BROTHER>SON>SON|male': '族伯父',
  'FATHER>FATHER>YOUNGER_BROTHER>SON>SON|male': '族叔父',
  'FATHER>FATHER>OLDER_BROTHER>SON>DAUGHTER|female': '族姑母',
  'FATHER>FATHER>YOUNGER_BROTHER>SON>DAUGHTER|female': '族姑母',

  // --- 堂伯叔父的子女 (从堂兄弟, 族兄弟经另一条路) ---
  'FATHER>FATHER>OLDER_BROTHER>SON>WIFE|female': '堂伯母',
  'FATHER>FATHER>YOUNGER_BROTHER>SON>WIFE|female': '堂婶母',

  // --- 族侄 (族兄弟之子) ---
  // 通过 FATHER>FATHER>OLDER_BROTHER>SON>SON 的 SON:
  // 需要6步, 超过 BFS_MAX_DEPTH, 故不收录

  // --- 玄孙辈的配偶 ---
  'SON>SON>SON>SON>WIFE|female': '玄孙媳',
  'SON>SON>SON>DAUGHTER>HUSBAND|male': '玄孙女婿',

  // --- 侄孙的子女 ---
  'OLDER_BROTHER>SON>SON>SON|male': '侄曾孙',
  'OLDER_BROTHER>SON>SON>DAUGHTER|female': '侄曾孙女',
  'YOUNGER_BROTHER>SON>SON>SON|male': '侄曾孙',
  'YOUNGER_BROTHER>SON>SON>DAUGHTER|female': '侄曾孙女',

  // --- 外甥孙的子女 ---
  'OLDER_SISTER>SON>SON>SON|male': '外甥曾孙',
  'OLDER_SISTER>SON>SON>DAUGHTER|female': '外甥曾孙女',
  'YOUNGER_SISTER>SON>SON>SON|male': '外甥曾孙',
  'YOUNGER_SISTER>SON>SON>DAUGHTER|female': '外甥曾孙女',

  // --- 配偶的祖父母 ---
  'HUSBAND>FATHER>FATHER|male': '公祖父',
  'HUSBAND>FATHER>MOTHER|female': '公祖母',
  'WIFE>FATHER>FATHER|male': '岳祖父',
  'WIFE>FATHER>MOTHER|female': '岳祖母',
  'HUSBAND>MOTHER>FATHER|male': '公外祖父',
  'HUSBAND>MOTHER>MOTHER|female': '公外祖母',
  'WIFE>MOTHER>FATHER|male': '岳外祖父',
  'WIFE>MOTHER>MOTHER|female': '岳外祖母',

  // --- 配偶的兄弟姐妹的子女 ---
  'HUSBAND>OLDER_BROTHER>SON|male': '夫侄',
  'HUSBAND>OLDER_BROTHER>DAUGHTER|female': '夫侄女',
  'HUSBAND>YOUNGER_BROTHER>SON|male': '夫侄',
  'HUSBAND>YOUNGER_BROTHER>DAUGHTER|female': '夫侄女',
  'WIFE>OLDER_BROTHER>SON|male': '妻外甥',
  'WIFE>OLDER_BROTHER>DAUGHTER|female': '妻外甥女',
  'WIFE>YOUNGER_BROTHER>SON|male': '妻外甥',
  'WIFE>YOUNGER_BROTHER>DAUGHTER|female': '妻外甥女',
  'HUSBAND>OLDER_SISTER>SON|male': '夫外甥',
  'HUSBAND>OLDER_SISTER>DAUGHTER|female': '夫外甥女',
  'HUSBAND>YOUNGER_SISTER>SON|male': '夫外甥',
  'HUSBAND>YOUNGER_SISTER>DAUGHTER|female': '夫外甥女',
  'WIFE>OLDER_SISTER>SON|male': '妻外甥',
  'WIFE>OLDER_SISTER>DAUGHTER|female': '妻外甥女',
  'WIFE>YOUNGER_SISTER>SON|male': '妻外甥',
  'WIFE>YOUNGER_SISTER>DAUGHTER|female': '妻外甥女',

  // --- 侄孙辈的配偶 ---
  'OLDER_BROTHER>SON>SON>WIFE|female': '侄孙媳',
  'OLDER_BROTHER>SON>DAUGHTER>HUSBAND|male': '侄孙女婿',
  'YOUNGER_BROTHER>SON>SON>WIFE|female': '侄孙媳',
  'YOUNGER_BROTHER>SON>DAUGHTER>HUSBAND|male': '侄孙女婿',

  // --- 舅祖父的配偶 ---
  'FATHER>MOTHER>OLDER_BROTHER>WIFE|female': '舅祖母',
  'FATHER>MOTHER>YOUNGER_BROTHER>WIFE|female': '舅祖母',

  // --- 姨祖母的配偶 ---
  'FATHER>MOTHER>OLDER_SISTER>HUSBAND|male': '姨祖父',
  'FATHER>MOTHER>YOUNGER_SISTER>HUSBAND|male': '姨祖父',

  // --- 曾伯叔祖父的配偶 ---
  'FATHER>FATHER>FATHER>OLDER_BROTHER>WIFE|female': '曾伯祖母',
  'FATHER>FATHER>FATHER>YOUNGER_BROTHER>WIFE|female': '曾叔祖母'
}

module.exports = FORMAL_TITLE_MAP
