-- 연락처 화면을 방명록으로 합쳤다(MYH-216). 위쪽 메뉴의 「연락처」 줄을 뺀다.
-- /contact 는 /guestbook 으로 넘어가니, 메뉴를 고쳐 다른 이름으로 둔 줄은
-- 그대로 둬도 닿는다(이름이 처음 그대로일 때만 지운다).

DELETE FROM "menus" WHERE href = '/contact' AND label = '연락처';
