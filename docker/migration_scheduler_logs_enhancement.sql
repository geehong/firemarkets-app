-- FILE: /docker/migration_scheduler_logs_enhancement.sql
-- Phase 1: scheduler_logs 테이블 확장

ALTER TABLE `scheduler_logs`
ADD COLUMN `current_task` VARCHAR(255) NULL COMMENT '현재 작업 중인 자산 또는 메트릭' AFTER `status`,
ADD COLUMN `strategy_used` VARCHAR(100) NULL COMMENT '사용된 수집 전략' AFTER `current_task`,
ADD COLUMN `checkpoint_data` JSON NULL COMMENT '체크포인트 정보' AFTER `strategy_used`,
ADD COLUMN `retry_count` INT DEFAULT 0 COMMENT '재시도 횟수' AFTER `checkpoint_data`;

-- 기존 status 컬럼이 있다면 타입을 변경하고 기본값을 설정
ALTER TABLE `scheduler_logs` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'pending';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_scheduler_logs_status ON scheduler_logs(status);
CREATE INDEX idx_scheduler_logs_job_name ON scheduler_logs(job_name);
CREATE INDEX idx_scheduler_logs_start_time ON scheduler_logs(start_time);










