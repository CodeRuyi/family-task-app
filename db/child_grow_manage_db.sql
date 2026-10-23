/*
 Navicat Premium Dump SQL

 Source Server         : pigappusers
 Source Server Type    : MySQL
 Source Server Version : 80027 (8.0.27)
 Source Host           : localhost:3306
 Source Schema         : child_grow_manage_db

 Target Server Type    : MySQL
 Target Server Version : 80027 (8.0.27)
 File Encoding         : 65001

 Date: 23/10/2026 15:00:33
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for badge
-- ----------------------------
DROP TABLE IF EXISTS `badge`;
CREATE TABLE `badge`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '勋章名称',
  `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '图标URL',
  `condition_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'consecutive_days / total_points / task_count / category_count',
  `condition_value` int NOT NULL COMMENT '条件数值',
  `description` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '描述',
  `is_auto` tinyint NULL DEFAULT 1 COMMENT '是否自动颁发',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 22 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '勋章定义表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of badge
-- ----------------------------
INSERT INTO `badge` VALUES (1, '勤奋小达人', '/badge/hard.png', 'task_count', 10, '累计完成10次任务自动领取', 1, '2026-06-02 20:01:57');
INSERT INTO `badge` VALUES (2, '百积分学霸', '/badge/point100.png', 'total_points', 100, '积攒满100积分解锁勋章', 1, '2026-06-02 20:01:57');
INSERT INTO `badge` VALUES (3, '每日坚持之星', '/badge/daily.png', 'consecutive_days', 7, '连续7天完成每日任务', 1, '2026-06-03 09:30:00');
INSERT INTO `badge` VALUES (4, '学习之星', 'star', 'task_count', 30, '完成30个学习任务', 1, '2026-06-18 16:59:00');
INSERT INTO `badge` VALUES (5, '家务小能手', 'broom', 'task_count', 20, '完成20个家务任务', 1, '2026-06-18 16:59:00');
INSERT INTO `badge` VALUES (6, '习惯达人', 'clock', 'consecutive_days', 7, '连续7天完成任务', 1, '2026-06-18 16:59:00');
INSERT INTO `badge` VALUES (7, '全勤奖', 'cup', 'month_all_finish', 1, '当月任务全部完成', 1, '2026-06-18 16:59:00');
INSERT INTO `badge` VALUES (8, '进步之星', 'chart', 'rate_up', 20, '完成率提升20%', 1, '2026-06-18 16:59:00');
INSERT INTO `badge` VALUES (9, '团队协作', 'handshake', 'group_task', 1, '小组共同完成任务', 1, '2026-06-18 16:59:00');
INSERT INTO `badge` VALUES (10, '学习之星', 'star', 'task_count', 30, '完成30个学习任务', 1, '2026-06-18 17:04:29');
INSERT INTO `badge` VALUES (11, '家务小能手', 'broom', 'task_count', 20, '完成20个家务任务', 1, '2026-06-18 17:04:29');
INSERT INTO `badge` VALUES (12, '习惯达人', 'clock', 'consecutive_days', 7, '连续7天完成任务', 1, '2026-06-18 17:04:29');
INSERT INTO `badge` VALUES (13, '全勤奖', 'cup', 'month_all_finish', 1, '当月任务全部完成', 1, '2026-06-18 17:04:29');
INSERT INTO `badge` VALUES (14, '进步之星', 'chart', 'rate_up', 20, '完成率提升20%', 1, '2026-06-18 17:04:29');
INSERT INTO `badge` VALUES (15, '团队协作', 'handshake', 'group_task', 1, '小组共同完成任务', 1, '2026-06-18 17:04:29');
INSERT INTO `badge` VALUES (16, '学习之星', 'star', 'task_count', 30, '完成30个学习任务', 1, '2026-06-18 17:06:30');
INSERT INTO `badge` VALUES (17, '家务小能手', 'broom', 'task_count', 20, '完成20个家务任务', 1, '2026-06-18 17:06:30');
INSERT INTO `badge` VALUES (18, '习惯达人', 'clock', 'consecutive_days', 7, '连续7天完成任务', 1, '2026-06-18 17:06:30');
INSERT INTO `badge` VALUES (19, '全勤奖', 'cup', 'month_all_finish', 1, '当月任务全部完成', 1, '2026-06-18 17:06:30');
INSERT INTO `badge` VALUES (20, '进步之星', 'chart', 'rate_up', 20, '完成率提升20%', 1, '2026-06-18 17:06:30');
INSERT INTO `badge` VALUES (21, '团队协作', 'handshake', 'group_task', 1, '小组共同完成任务', 1, '2026-06-18 17:06:30');

-- ----------------------------
-- Table structure for class
-- ----------------------------
DROP TABLE IF EXISTS `class`;
CREATE TABLE `class`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `class_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '班级名称（如“大一班”）',
  `grade` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '年级（小班/中班/大班/一年级等）',
  `school_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '学年（如“2025-2026”）',
  `invite_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '班级邀请码（唯一）',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_invite_code`(`invite_code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 11 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '班级表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of class
-- ----------------------------
INSERT INTO `class` VALUES (1, '一年级1班', '一年级', '2025-2026', '1JZK-UJGN-47J4', '2026-06-02 19:59:07');
INSERT INTO `class` VALUES (2, '一年级2班', '一年级', '2025-2026', 'Y10288', '2026-06-03 09:22:10');
INSERT INTO `class` VALUES (3, '二年级1班', '二年级', '2026-2027', 'CLASS003', '2026-08-11 16:14:56');
INSERT INTO `class` VALUES (7, '三年级1班', '三年级', '2025-2026', 'S30199', '2026-06-17 16:28:41');
INSERT INTO `class` VALUES (8, '三年级2班', '三年级', '2025-2026', 'S30277', '2026-06-17 16:28:41');
INSERT INTO `class` VALUES (9, '三年级1班', '三年级', '2025-2026', 'S301', '2026-06-17 18:55:34');

-- ----------------------------
-- Table structure for family
-- ----------------------------
DROP TABLE IF EXISTS `family`;
CREATE TABLE `family`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '家庭ID',
  `family_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '家庭名称（如“李明一家”）',
  `owner_id` bigint NOT NULL COMMENT '主账号家长ID(user.id)',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `audit_status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'wait' COMMENT '审核状态 wait待审核 pass通过 reject拒绝',
  `points_balance` int NULL DEFAULT 0 COMMENT '家庭积分总余额',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_owner`(`owner_id` ASC) USING BTREE,
  CONSTRAINT `fk_family_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '家庭表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of family
-- ----------------------------
INSERT INTO `family` VALUES (1, '王家庭', 1, '2026-08-11 16:14:56', 'approved', 800);
INSERT INTO `family` VALUES (2, '李家庭', 3, '2026-08-11 16:14:56', 'approved', 1000);
INSERT INTO `family` VALUES (3, '张家庭', 4, '2026-08-11 16:14:56', 'approved', 1000);

-- ----------------------------
-- Table structure for family_member
-- ----------------------------
DROP TABLE IF EXISTS `family_member`;
CREATE TABLE `family_member`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `family_id` bigint NOT NULL COMMENT '家庭ID',
  `user_id` bigint NOT NULL COMMENT '用户ID（家长或孩子）',
  `relation` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '关系：father/mother/child',
  `is_active` tinyint NULL DEFAULT 1 COMMENT '是否当前活跃（用于多孩子切换）',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_family_user`(`family_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE,
  CONSTRAINT `fk_fm_family` FOREIGN KEY (`family_id`) REFERENCES `family` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_fm_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 11 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '家庭成员关联表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of family_member
-- ----------------------------
INSERT INTO `family_member` VALUES (1, 1, 1, 'parent', 1);
INSERT INTO `family_member` VALUES (2, 1, 2, 'parent', 1);
INSERT INTO `family_member` VALUES (3, 1, 5, 'child', 1);
INSERT INTO `family_member` VALUES (4, 1, 8, 'child', 1);
INSERT INTO `family_member` VALUES (5, 2, 3, 'parent', 1);
INSERT INTO `family_member` VALUES (6, 2, 6, 'child', 1);
INSERT INTO `family_member` VALUES (7, 3, 4, 'parent', 1);
INSERT INTO `family_member` VALUES (8, 3, 7, 'child', 1);

-- ----------------------------
-- Table structure for points_log
-- ----------------------------
DROP TABLE IF EXISTS `points_log`;
CREATE TABLE `points_log`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `child_id` bigint NOT NULL COMMENT '孩子ID',
  `change` int NOT NULL COMMENT '变动积分（正为增加，负为扣除）',
  `balance` int NOT NULL COMMENT '变动后余额',
  `reason` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '原因（完成任务/兑换奖励/手动调整）',
  `related_id` bigint NULL DEFAULT NULL COMMENT '关联ID（task_id 或 order_id）',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'task' COMMENT '日志类型 badge勋章/task任务积分',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_child_created`(`child_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `fk_points_child` FOREIGN KEY (`child_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '积分流水表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of points_log
-- ----------------------------
INSERT INTO `points_log` VALUES (1, 5, 20, 20, '完成今日数学口算', 1, '2026-08-09 16:14:56', 'earn');
INSERT INTO `points_log` VALUES (2, 5, 15, 35, '完成整理个人书桌', 2, '2026-08-10 16:14:56', 'earn');
INSERT INTO `points_log` VALUES (3, 5, 10, 45, '完成早睡9点上床', 3, '2026-08-11 04:14:56', 'earn');
INSERT INTO `points_log` VALUES (4, 8, 25, 25, '完成朗读语文课文', 4, '2026-08-09 16:14:56', 'earn');
INSERT INTO `points_log` VALUES (5, 8, 10, 35, '完成今日数学口算', 1, '2026-08-10 16:14:56', 'earn');
INSERT INTO `points_log` VALUES (6, 6, 20, 20, '完成今日数学口算', 1, '2026-08-09 16:14:56', 'earn');
INSERT INTO `points_log` VALUES (7, 6, 8, 28, '完成练琴15分钟', 5, '2026-08-10 16:14:56', 'earn');
INSERT INTO `points_log` VALUES (8, 7, 18, 18, '完成朗读语文课文', 4, '2026-08-09 16:14:56', 'earn');
INSERT INTO `points_log` VALUES (9, 7, 8, 26, '完成早睡9点上床', 3, '2026-08-10 16:14:56', 'earn');
INSERT INTO `points_log` VALUES (10, 8, 10, 810, '完成任务：', 37, '2026-09-11 14:57:16', 'task');
INSERT INTO `points_log` VALUES (11, 8, -10, 800, '撤销完成：完成语文作业', 37, '2026-09-11 14:57:16', 'task');
INSERT INTO `points_log` VALUES (12, 8, 10, 810, '完成任务：', 37, '2026-09-11 15:05:54', 'task');
INSERT INTO `points_log` VALUES (13, 8, -10, 800, '撤销完成：完成语文作业', 37, '2026-09-11 15:05:54', 'task');
INSERT INTO `points_log` VALUES (14, 8, 10, 810, '完成任务：', 37, '2026-09-11 15:09:00', 'task');
INSERT INTO `points_log` VALUES (15, 8, -10, 800, '撤销完成：完成语文作业', 37, '2026-09-11 15:09:00', 'task');

-- ----------------------------
-- Table structure for redeem_item
-- ----------------------------
DROP TABLE IF EXISTS `redeem_item`;
CREATE TABLE `redeem_item`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `family_id` bigint NOT NULL COMMENT '所属家庭（家长设置）',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '奖励名称',
  `points_cost` int NOT NULL COMMENT '所需积分',
  `stock` int NULL DEFAULT -1 COMMENT '库存（-1表示无限）',
  `description` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '奖励说明',
  `expiry_date` date NULL DEFAULT NULL COMMENT '有效期截止日',
  `is_enabled` tinyint NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '其他' COMMENT '分类（文具、书包、练习册、活动等）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_family`(`family_id` ASC) USING BTREE,
  CONSTRAINT `fk_redeem_family` FOREIGN KEY (`family_id`) REFERENCES `family` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 18 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '积分商城兑换项表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of redeem_item
-- ----------------------------
INSERT INTO `redeem_item` VALUES (1, 1, '周末游乐园', 200, 4, '家庭周末一起去游乐园玩耍', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (2, 1, '额外30分钟游戏', 50, 10, '每天可额外获得30分钟游戏时间', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (3, 1, '选择晚餐菜单', 100, 8, '选择今晚的家庭晚餐吃什么', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (4, 1, '免做家务一次', 150, 6, '可以免做一次家务劳动', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (5, 1, '购买心仪玩具', 300, 3, '获得心仪的小玩具一个', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (6, 2, '公园野餐', 180, 4, '家庭周末公园野餐', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (7, 2, '额外30分钟游戏', 50, 10, '每天可额外获得30分钟游戏时间', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (8, 2, '选择晚餐菜单', 100, 8, '选择今晚的家庭晚餐吃什么', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (9, 2, '免做家务一次', 150, 6, '可以免做一次家务劳动', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (10, 3, '动物园门票', 250, 3, '家庭周末去动物园', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (11, 3, '额外30分钟游戏', 50, 10, '每天可额外获得30分钟游戏时间', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (12, 3, '选择晚餐菜单', 100, 8, '选择今晚的家庭晚餐吃什么', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (13, 3, '免做家务一次', 150, 6, '可以免做一次家务劳动', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');
INSERT INTO `redeem_item` VALUES (14, 3, '购买心仪玩具', 300, 3, '获得心仪的小玩具一个', '2026-09-10', 1, '2026-08-11 16:21:55', '其他');

-- ----------------------------
-- Table structure for redeem_order
-- ----------------------------
DROP TABLE IF EXISTS `redeem_order`;
CREATE TABLE `redeem_order`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `item_id` bigint NOT NULL COMMENT '兑换项ID',
  `child_id` bigint NOT NULL COMMENT '申请的孩子ID',
  `points_cost` int NOT NULL COMMENT '申请时扣除的积分数',
  `status` tinyint NULL DEFAULT 0 COMMENT '0-待确认 1-已完成 2-拒绝',
  `applied_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `processed_at` datetime NULL DEFAULT NULL COMMENT '处理时间',
  `review_comment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '拒绝理由',
  `family_id` bigint NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_child`(`child_id` ASC) USING BTREE,
  INDEX `idx_item`(`item_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  CONSTRAINT `fk_order_child` FOREIGN KEY (`child_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_order_item` FOREIGN KEY (`item_id`) REFERENCES `redeem_item` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '兑换订单表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of redeem_order
-- ----------------------------
INSERT INTO `redeem_order` VALUES (1, 1, 5, 200, 0, '2026-08-11 16:22:03', NULL, NULL, 1);
INSERT INTO `redeem_order` VALUES (2, 2, 5, 50, 0, '2026-08-11 15:32:03', NULL, NULL, 1);
INSERT INTO `redeem_order` VALUES (3, 4, 8, 150, 0, '2026-08-11 16:02:03', NULL, NULL, 1);
INSERT INTO `redeem_order` VALUES (4, 6, 6, 50, 0, '2026-08-11 16:12:03', NULL, NULL, 2);
INSERT INTO `redeem_order` VALUES (5, 11, 7, 50, 1, '2026-08-09 16:32:03', '2026-08-10 16:32:03', '家长已确认', 3);
INSERT INTO `redeem_order` VALUES (6, 13, 7, 150, 1, '2026-08-06 16:32:03', '2026-08-07 16:32:03', '家长已确认', 3);
INSERT INTO `redeem_order` VALUES (7, 1, 5, 200, 1, '2026-08-27 13:58:33', NULL, NULL, 1);

-- ----------------------------
-- Table structure for student_class
-- ----------------------------
DROP TABLE IF EXISTS `student_class`;
CREATE TABLE `student_class`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `child_id` bigint NOT NULL COMMENT '孩子ID(user.id, role=2)',
  `class_id` bigint NOT NULL COMMENT '班级ID',
  `bind_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '绑定码（班主任生成）',
  `joined_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入班级时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_child_class`(`child_id` ASC, `class_id` ASC) USING BTREE,
  INDEX `idx_class`(`class_id` ASC) USING BTREE,
  INDEX `idx_bind_code`(`bind_code` ASC) USING BTREE,
  CONSTRAINT `fk_sc_child` FOREIGN KEY (`child_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_sc_class` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '孩子班级归属表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of student_class
-- ----------------------------
INSERT INTO `student_class` VALUES (1, 5, 1, 'BIND101', '2026-08-11 16:14:56');
INSERT INTO `student_class` VALUES (2, 8, 1, 'BIND102', '2026-08-11 16:14:56');
INSERT INTO `student_class` VALUES (3, 6, 2, 'BIND103', '2026-08-11 16:14:56');
INSERT INTO `student_class` VALUES (4, 7, 3, 'BIND104', '2026-08-11 16:14:56');

-- ----------------------------
-- Table structure for subject
-- ----------------------------
DROP TABLE IF EXISTS `subject`;
CREATE TABLE `subject`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `subject_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '学科名称（语文/数学/英语/习惯等）',
  `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '图标URL',
  `sort_order` int NULL DEFAULT 0 COMMENT '排序',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '学科表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of subject
-- ----------------------------
INSERT INTO `subject` VALUES (1, '语文', '/icon/chinese.png', 1);
INSERT INTO `subject` VALUES (2, '数学', '/icon/math.png', 2);
INSERT INTO `subject` VALUES (3, '好习惯', '/icon/habit.png', 3);
INSERT INTO `subject` VALUES (4, '英语', '/icon/english.png', 4);

-- ----------------------------
-- Table structure for task_instance
-- ----------------------------
DROP TABLE IF EXISTS `task_instance`;
CREATE TABLE `task_instance`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_id` bigint NULL DEFAULT NULL COMMENT '模板ID，可为NULL',
  `family_id` bigint NOT NULL COMMENT '所属家庭ID',
  `child_id` bigint NOT NULL COMMENT '孩子ID',
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '任务名称',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT '任务说明文字',
  `points` int NOT NULL COMMENT '奖励积分',
  `deadline` datetime NOT NULL COMMENT '截止时间',
  `need_photo` tinyint NULL DEFAULT 0 COMMENT '是否需要拍照',
  `need_location` tinyint NULL DEFAULT 0 COMMENT '是否需要位置',
  `repeat_type` tinyint NULL DEFAULT 0 COMMENT '0-不重复 1-每日 2-每周',
  `repeat_end_date` date NULL DEFAULT NULL COMMENT '重复截止日期',
  `status` tinyint NULL DEFAULT 0 COMMENT '0-待完成 1-待审核 2-已完成 3-逾期 4-无法完成',
  `created_by` bigint NULL DEFAULT NULL COMMENT '下发者（家长或班主任）',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `done` tinyint(1) NULL DEFAULT 0 COMMENT '0-未完成 1-已完成',
  `time_text` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '' COMMENT '时间文本（如：今天、明天）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_child_status`(`child_id` ASC, `status` ASC) USING BTREE,
  INDEX `idx_deadline`(`deadline` ASC) USING BTREE,
  INDEX `idx_family`(`family_id` ASC) USING BTREE,
  INDEX `idx_template`(`template_id` ASC) USING BTREE,
  CONSTRAINT `fk_instance_child` FOREIGN KEY (`child_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_instance_family` FOREIGN KEY (`family_id`) REFERENCES `family` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_instance_template` FOREIGN KEY (`template_id`) REFERENCES `task_template` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 56 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '任务实例表（下发到具体孩子）' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of task_instance
-- ----------------------------
INSERT INTO `task_instance` VALUES (1, 1, 1, 5, '今日数学口算', '完成20道数学口算题', 10, '2026-08-14 16:14:56', 1, 0, 0, NULL, 0, 9, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (2, 2, 1, 5, '整理个人书桌', '整理好自己的书桌和文具', 5, '2026-08-16 16:14:56', 0, 0, 0, NULL, 0, 9, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (3, 3, 1, 5, '早睡9点上床', '晚上21点前上床休息', 8, '2026-08-18 16:14:56', 0, 0, 0, NULL, 0, 9, '2026-08-11 16:14:56', 1, '');
INSERT INTO `task_instance` VALUES (4, 4, 1, 8, '朗读语文课文', '大声朗读语文课文并背诵', 6, '2026-08-15 16:14:56', 1, 0, 0, NULL, 0, 9, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (5, 1, 1, 8, '今日数学口算', '完成20道数学口算题', 10, '2026-08-14 16:14:56', 1, 0, 0, NULL, 0, 9, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (6, 1, 2, 6, '今日数学口算', '完成20道数学口算题', 10, '2026-08-14 16:14:56', 1, 0, 0, NULL, 0, 10, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (7, 5, 2, 6, '练琴15分钟', '练习钢琴15分钟以上', 8, '2026-08-16 16:14:56', 0, 0, 0, NULL, 0, 10, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (8, 2, 2, 6, '整理个人书桌', '整理好自己的书桌和文具', 5, '2026-08-17 16:14:56', 0, 0, 0, NULL, 0, 10, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (9, 4, 3, 7, '朗读语文课文', '大声朗读语文课文并背诵', 6, '2026-08-14 16:14:56', 1, 0, 0, NULL, 0, 11, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (10, 7, 3, 7, '阅读30分钟', '安静阅读课外书30分钟', 6, '2026-08-16 16:14:56', 0, 0, 0, NULL, 0, 11, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (11, 3, 3, 7, '早睡9点上床', '晚上21点前上床休息', 8, '2026-08-18 16:14:56', 0, 0, 0, NULL, 0, 11, '2026-08-11 16:14:56', 0, '');
INSERT INTO `task_instance` VALUES (12, NULL, 1, 5, '完成数学作业', NULL, 10, '2026-08-19 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 1, '今天');
INSERT INTO `task_instance` VALUES (13, NULL, 1, 5, '阅读课外书20分钟', NULL, 15, '2026-08-19 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 1, '今天');
INSERT INTO `task_instance` VALUES (14, NULL, 1, 5, '帮助做家务', NULL, 20, '2026-08-18 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 1, '昨天');
INSERT INTO `task_instance` VALUES (15, NULL, 1, 5, '练字一页', NULL, 10, '2026-08-20 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 1, '明天');
INSERT INTO `task_instance` VALUES (16, NULL, 2, 6, '英语单词背诵', NULL, 10, '2026-08-19 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 0, '今天');
INSERT INTO `task_instance` VALUES (17, NULL, 2, 6, '练习钢琴30分钟', NULL, 15, '2026-08-19 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 0, '今天');
INSERT INTO `task_instance` VALUES (18, NULL, 2, 6, '整理房间', NULL, 20, '2026-08-20 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 0, '明天');
INSERT INTO `task_instance` VALUES (19, NULL, 2, 6, '阅读课外书', NULL, 10, '2026-08-18 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 1, '昨天');
INSERT INTO `task_instance` VALUES (20, NULL, 3, 7, '完成科学作业', NULL, 12, '2026-08-19 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 0, '今天');
INSERT INTO `task_instance` VALUES (21, NULL, 3, 7, '跳绳100个', NULL, 10, '2026-08-19 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 0, '今天');
INSERT INTO `task_instance` VALUES (22, NULL, 3, 7, '练习书法', NULL, 15, '2026-08-20 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 0, '明天');
INSERT INTO `task_instance` VALUES (23, NULL, 3, 7, '帮助做饭', NULL, 20, '2026-08-18 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:04:36', 1, '昨天');
INSERT INTO `task_instance` VALUES (28, NULL, 3, 8, '完成语文作业', NULL, 10, '2026-08-19 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:06:14', 0, '今天');
INSERT INTO `task_instance` VALUES (29, NULL, 3, 8, '画画练习', NULL, 10, '2026-08-19 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:06:14', 0, '今天');
INSERT INTO `task_instance` VALUES (30, NULL, 3, 8, '做手工', NULL, 15, '2026-08-20 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:06:14', 0, '明天');
INSERT INTO `task_instance` VALUES (31, NULL, 3, 8, '收拾书桌', NULL, 10, '2026-08-18 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-18 15:06:14', 1, '昨天');
INSERT INTO `task_instance` VALUES (32, NULL, 1, 5, '完成数学作业', NULL, 10, '2026-08-28 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 1, '今天');
INSERT INTO `task_instance` VALUES (33, NULL, 1, 5, '阅读课外书20分钟', NULL, 15, '2026-08-28 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 1, '今天');
INSERT INTO `task_instance` VALUES (34, NULL, 1, 5, '帮助做家务', NULL, 20, '2026-08-27 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 1, '昨天');
INSERT INTO `task_instance` VALUES (35, NULL, 1, 5, '练字一页', NULL, 10, '2026-08-29 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 1, '明天');
INSERT INTO `task_instance` VALUES (36, NULL, 1, 5, '整理个人书桌', NULL, 5, '2026-08-26 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 1, '前天');
INSERT INTO `task_instance` VALUES (37, NULL, 1, 8, '完成语文作业', NULL, 10, '2026-08-28 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 0, '今天');
INSERT INTO `task_instance` VALUES (38, NULL, 1, 8, '画画练习', NULL, 10, '2026-08-28 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 0, '今天');
INSERT INTO `task_instance` VALUES (39, NULL, 1, 8, '做手工', NULL, 15, '2026-08-29 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 0, '明天');
INSERT INTO `task_instance` VALUES (40, NULL, 1, 8, '收拾书桌', NULL, 10, '2026-08-27 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 1, '昨天');
INSERT INTO `task_instance` VALUES (41, NULL, 1, 8, '阅读课外书30分钟', NULL, 6, '2026-08-26 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:05:52', 1, '前天');
INSERT INTO `task_instance` VALUES (42, NULL, 2, 6, '英语单词背诵', NULL, 10, '2026-08-28 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:09', 0, '今天');
INSERT INTO `task_instance` VALUES (43, NULL, 2, 6, '练习钢琴30分钟', NULL, 15, '2026-08-28 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:09', 0, '今天');
INSERT INTO `task_instance` VALUES (44, NULL, 2, 6, '整理房间', NULL, 20, '2026-08-29 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:09', 0, '明天');
INSERT INTO `task_instance` VALUES (45, NULL, 2, 6, '阅读课外书', NULL, 10, '2026-08-27 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:09', 1, '昨天');
INSERT INTO `task_instance` VALUES (46, NULL, 2, 6, '完成科学作业', NULL, 12, '2026-08-26 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:09', 1, '前天');
INSERT INTO `task_instance` VALUES (47, NULL, 3, 7, '完成科学作业', NULL, 12, '2026-08-28 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:25', 0, '今天');
INSERT INTO `task_instance` VALUES (48, NULL, 3, 7, '跳绳100个', NULL, 10, '2026-08-28 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:25', 0, '今天');
INSERT INTO `task_instance` VALUES (49, NULL, 3, 7, '练习书法', NULL, 15, '2026-08-29 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:25', 0, '明天');
INSERT INTO `task_instance` VALUES (50, NULL, 3, 7, '帮助做饭', NULL, 20, '2026-08-27 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:25', 1, '昨天');
INSERT INTO `task_instance` VALUES (51, NULL, 3, 7, '早睡9点前上床', NULL, 8, '2026-08-26 23:59:59', 0, 0, 0, NULL, 0, NULL, '2026-08-27 13:06:25', 1, '前天');

-- ----------------------------
-- Table structure for task_submission
-- ----------------------------
DROP TABLE IF EXISTS `task_submission`;
CREATE TABLE `task_submission`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `task_id` bigint NOT NULL COMMENT '任务实例ID',
  `child_id` bigint NOT NULL COMMENT '孩子ID',
  `media_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '照片URL',
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '位置文本',
  `latitude` decimal(10, 8) NULL DEFAULT NULL COMMENT '纬度',
  `longitude` decimal(11, 8) NULL DEFAULT NULL COMMENT '经度',
  `submitted_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  `review_status` tinyint NULL DEFAULT 0 COMMENT '0-待审核 1-通过 2-驳回',
  `review_comment` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '驳回理由',
  `reviewed_at` datetime NULL DEFAULT NULL COMMENT '审核时间',
  `reviewed_by` bigint NULL DEFAULT NULL COMMENT '审核人（家长）',
  `submit_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_task`(`task_id` ASC) USING BTREE,
  INDEX `idx_child`(`child_id` ASC) USING BTREE,
  INDEX `idx_review_status`(`review_status` ASC) USING BTREE,
  CONSTRAINT `fk_submission_child` FOREIGN KEY (`child_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_submission_task` FOREIGN KEY (`task_id`) REFERENCES `task_instance` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '任务提交记录表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of task_submission
-- ----------------------------
INSERT INTO `task_submission` VALUES (1, 1, 5, '/upload/task/wangxiaoyu_math1.jpg', NULL, NULL, NULL, '2026-08-11 16:04:56', 0, NULL, NULL, NULL, NULL);
INSERT INTO `task_submission` VALUES (2, 2, 5, NULL, NULL, NULL, NULL, '2026-08-11 15:49:56', 0, NULL, NULL, NULL, NULL);
INSERT INTO `task_submission` VALUES (3, 4, 8, '/upload/task/wangxiaoya_read1.jpg', NULL, NULL, NULL, '2026-08-11 15:44:56', 0, NULL, NULL, NULL, NULL);
INSERT INTO `task_submission` VALUES (4, 6, 6, '/upload/task/limeng_math1.jpg', NULL, NULL, NULL, '2026-08-11 15:54:56', 0, NULL, NULL, NULL, NULL);
INSERT INTO `task_submission` VALUES (5, 9, 7, '/upload/task/zhangshuai_read1.jpg', NULL, NULL, NULL, '2026-08-11 15:29:56', 0, NULL, NULL, NULL, NULL);
INSERT INTO `task_submission` VALUES (6, 10, 7, NULL, NULL, NULL, NULL, '2026-08-11 15:14:56', 0, NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for task_template
-- ----------------------------
DROP TABLE IF EXISTS `task_template`;
CREATE TABLE `task_template`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '模板名称',
  `category` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '学习/家务/习惯',
  `subject_id` bigint NULL DEFAULT NULL COMMENT '学科ID，通用为NULL',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT '任务描述',
  `example_media` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '示例图片URL',
  `min_points` int NOT NULL COMMENT '最小积分',
  `max_points` int NOT NULL COMMENT '最大积分',
  `need_photo` tinyint NULL DEFAULT 0 COMMENT '是否需要拍照',
  `need_location` tinyint NULL DEFAULT 0 COMMENT '是否需要位置',
  `is_enabled` tinyint NULL DEFAULT 1 COMMENT '是否启用',
  `usage_count` int NULL DEFAULT 0 COMMENT '使用次数',
  `created_by` bigint NULL DEFAULT NULL COMMENT '创建人（学校管理员）',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_category`(`category` ASC) USING BTREE,
  INDEX `idx_subject`(`subject_id` ASC) USING BTREE,
  INDEX `idx_enabled`(`is_enabled` ASC) USING BTREE,
  CONSTRAINT `fk_template_subject` FOREIGN KEY (`subject_id`) REFERENCES `subject` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '任务模板表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of task_template
-- ----------------------------
INSERT INTO `task_template` VALUES (1, '口算20道', '学习', 2, '完成20道数学口算并拍照', NULL, 5, 10, 1, 0, 1, 0, 4, '2026-06-02 20:00:47');
INSERT INTO `task_template` VALUES (2, '整理书桌', '家务', NULL, '自己整理书桌收纳书本', NULL, 3, 6, 1, 0, 1, 0, 4, '2026-06-02 20:00:47');
INSERT INTO `task_template` VALUES (3, '早睡9点上床', '习惯', 3, '晚上21点前上床休息', NULL, 4, 8, 0, 0, 1, 0, 4, '2026-06-02 20:00:47');
INSERT INTO `task_template` VALUES (4, '朗读语文课文', '学习', 1, '大声朗读语文课文并背诵', NULL, 6, 12, 1, 0, 1, 0, 4, '2026-06-03 09:40:00');
INSERT INTO `task_template` VALUES (5, '练琴15分钟', '习惯', NULL, '练习钢琴15分钟以上', NULL, 8, 12, 0, 0, 1, 0, 10, '2026-08-11 16:14:56');
INSERT INTO `task_template` VALUES (6, '帮忙做家务', '家务', NULL, '主动帮忙做一项家务', NULL, 4, 8, 0, 0, 1, 0, 10, '2026-08-11 16:14:56');
INSERT INTO `task_template` VALUES (7, '阅读30分钟', '学习', 3, '安静阅读课外书30分钟', NULL, 6, 10, 0, 0, 1, 0, 11, '2026-08-11 16:14:56');

-- ----------------------------
-- Table structure for teacher_subject_class
-- ----------------------------
DROP TABLE IF EXISTS `teacher_subject_class`;
CREATE TABLE `teacher_subject_class`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '教师ID（role=5）',
  `subject_id` bigint NOT NULL COMMENT '学科ID',
  `class_id` bigint NOT NULL COMMENT '班级ID',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_teacher_subject_class`(`user_id` ASC, `subject_id` ASC, `class_id` ASC) USING BTREE,
  INDEX `idx_subject`(`subject_id` ASC) USING BTREE,
  INDEX `idx_class`(`class_id` ASC) USING BTREE,
  CONSTRAINT `fk_tsc_class` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_tsc_subject` FOREIGN KEY (`subject_id`) REFERENCES `subject` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_tsc_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '单科老师任课表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of teacher_subject_class
-- ----------------------------
INSERT INTO `teacher_subject_class` VALUES (1, 9, 1, 1, '2026-08-11 16:14:56');
INSERT INTO `teacher_subject_class` VALUES (2, 9, 1, 2, '2026-08-11 16:14:56');
INSERT INTO `teacher_subject_class` VALUES (3, 10, 2, 2, '2026-08-11 16:14:56');
INSERT INTO `teacher_subject_class` VALUES (4, 11, 3, 3, '2026-08-11 16:14:56');

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`  (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '手机号（登录账号）',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '加密密码',
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '昵称',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '头像URL',
  `role` tinyint NOT NULL COMMENT '角色：1-家长 2-孩子 3-班主任 4-学校管理员 5-单科老师',
  `status` tinyint NULL DEFAULT 1 COMMENT '状态：0-禁用 1-正常',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_phone`(`phone` ASC) USING BTREE,
  INDEX `idx_role`(`role` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 18 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '用户表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of user
-- ----------------------------
INSERT INTO `user` VALUES (1, '13500110001', '123456', '王爸爸', NULL, 1, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (2, '13500110002', '123456', '王妈妈', NULL, 1, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (3, '13500110003', '123456', '李妈妈', NULL, 1, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (4, '13500110004', '123456', '张爸爸', NULL, 1, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (5, '13500110005', '123456', '王小宇', NULL, 2, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (6, '13500110006', '123456', '李小萌', NULL, 2, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (7, '13500110007', '123456', '张小帅', NULL, 2, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (8, '13500110008', '123456', '王小雅', NULL, 2, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (9, '13500110009', '123456', '张班主任', NULL, 3, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (10, '13500110010', '123456', '刘数学老师', NULL, 3, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (11, '13500110011', '123456', '王英语老师', NULL, 3, 1, '2026-08-11 16:14:56', '2026-08-11 16:14:56');
INSERT INTO `user` VALUES (12, '13900139000', '123456', '小新', '', 2, 1, '2026-08-18 11:09:10', '2026-08-18 11:09:10');
INSERT INTO `user` VALUES (13, '15020661162', '$2b$10$6zgJGB3bCjJNka090uaTEu0NQCBVfB6J7I4bbwk.pAyCxdkwKSID6', '毅哥', '', 3, 1, '2026-09-04 19:45:41', '2026-09-04 19:45:41');

-- ----------------------------
-- Table structure for user_badge
-- ----------------------------
DROP TABLE IF EXISTS `user_badge`;
CREATE TABLE `user_badge`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL COMMENT '学生用户id',
  `badge_id` bigint NOT NULL COMMENT '勋章id',
  `teacher_id` bigint NOT NULL COMMENT '颁发教师id',
  `class_id` bigint NOT NULL COMMENT '所属班级id',
  `gain_time` datetime NOT NULL COMMENT '获得时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 26 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user_badge
-- ----------------------------
INSERT INTO `user_badge` VALUES (3, 5, 1, 9, 1, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (4, 5, 2, 9, 1, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (5, 5, 3, 9, 1, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (6, 5, 4, 9, 1, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (7, 5, 7, 9, 1, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (8, 6, 2, 10, 2, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (9, 6, 3, 10, 2, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (10, 6, 4, 10, 2, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (11, 6, 8, 10, 2, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (12, 6, 9, 10, 2, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (13, 7, 1, 11, 3, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (14, 7, 3, 11, 3, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (15, 7, 5, 11, 3, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (16, 7, 9, 11, 3, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (17, 8, 1, 9, 7, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (18, 8, 5, 9, 7, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (19, 8, 6, 9, 7, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (20, 8, 7, 9, 7, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (21, 12, 4, 10, 8, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (22, 12, 5, 10, 8, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (23, 12, 6, 10, 8, '2026-08-28 11:36:30');
INSERT INTO `user_badge` VALUES (24, 12, 8, 10, 8, '2026-08-28 11:36:30');

-- ----------------------------
-- Table structure for user_class
-- ----------------------------
DROP TABLE IF EXISTS `user_class`;
CREATE TABLE `user_class`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '教师ID（role=3或5）',
  `class_id` bigint NOT NULL COMMENT '班级ID',
  `role_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'class_teacher（班主任） / subject_teacher（单科老师）',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_class`(`user_id` ASC, `class_id` ASC) USING BTREE,
  INDEX `idx_class`(`class_id` ASC) USING BTREE,
  CONSTRAINT `fk_uc_class` FOREIGN KEY (`class_id`) REFERENCES `class` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_uc_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '教师班级关联表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of user_class
-- ----------------------------
INSERT INTO `user_class` VALUES (7, 9, 1, 'class_teacher');
INSERT INTO `user_class` VALUES (8, 10, 3, 'subject_teacher');
INSERT INTO `user_class` VALUES (9, 11, 7, 'subject_teacher');
INSERT INTO `user_class` VALUES (10, 13, 7, 'class_teacher');

-- ----------------------------
-- Table structure for user_setting
-- ----------------------------
DROP TABLE IF EXISTS `user_setting`;
CREATE TABLE `user_setting`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `notification_enabled` tinyint NULL DEFAULT 1 COMMENT '是否开启消息提醒',
  `dark_mode` tinyint NULL DEFAULT 0 COMMENT '是否开启深色模式',
  `auto_sync` tinyint NULL DEFAULT 1 COMMENT '是否自动同步',
  `remind_time` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '20:00' COMMENT '每日提醒时间',
  `language` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'zh-CN' COMMENT '语言',
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_setting`(`user_id` ASC) USING BTREE,
  CONSTRAINT `fk_setting_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '用户设置表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user_setting
-- ----------------------------
INSERT INTO `user_setting` VALUES (2, 5, 0, 0, 0, '20:00', 'zh-CN', '2026-09-11 15:09:00');
INSERT INTO `user_setting` VALUES (3, 1, 1, 0, 1, '20:00', 'zh-CN', '2026-09-11 14:25:53');

SET FOREIGN_KEY_CHECKS = 1;
