-- 옛 글의 본문 그림을 글에 매단다.
--
-- 지금까지 블로그·짧은 글의 본문 그림은 uploads 에 내용 해시로만 들어갔다.
-- 어느 글 것인지 적는 자리가 없어서 "이 글에 올린 그림" 을 물어볼 수가
-- 없었다(MYH-145). 0025 에서 attachments 에 kind 를 냈으니 여기서 채운다.
--
-- 찾는 법은 본문을 훑는 것뿐이다. 마크다운에 `/uploads/<해시>` 로 박혀
-- 있으므로 그 해시로 uploads 와 맞춘다. 본문에 안 박힌 채 떠 있는 그림은
-- 살릴 길이 없는데, 그건 어차피 아무 데서도 안 쓰는 것이다.
--
-- 비밀글은 못 한다. 본문이 담겨 있어 SQL 로 훑을 수 없다. 운영에는
-- secret_attachments 에 한 줄도 없고, 개발기는 손으로 맞췄다.

INSERT INTO attachments (post_id, upload_id, filename, kind)
SELECT p.id, u.id, u.filename, 'image'
  FROM posts p
  JOIN uploads u ON position('/uploads/' || u.id IN p.content) > 0
 WHERE NOT EXISTS (
         SELECT 1 FROM attachments a
          WHERE a.post_id = p.id AND a.upload_id = u.id AND a.kind = 'image'
       );
