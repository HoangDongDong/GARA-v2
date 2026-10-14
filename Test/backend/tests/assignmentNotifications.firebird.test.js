const test=require('node:test'),assert=require('node:assert/strict');
const db=require('../../../backend/src/db'),service=require('../../../backend/src/services/assignmentNotifications');
test('real Firebird assignments only reach linked active accounts and rolled-back jobs never remain',{skip:process.env.TEST_FIREBIRD!=='1'},async()=>{
  const rollback=Error('NOTIFICATION_FIXTURE_ROLLBACK');let assignmentId;
  await assert.rejects(db.transaction(async(q,x,uuid)=>{
    const employee=uuid(),recipient=uuid(),other=uuid(),repair=uuid();assignmentId=uuid();
    await x("INSERT INTO DNHANVIEN (ID,NAME,STATUS,USERCREATEDID) VALUES (?,'Notification fixture',1,'TEST')",[employee]);
    await x("INSERT INTO SUSER (ID,NAME,USERNAME,DNHANVIENID,ISADMIN,STATUS,USERCREATEDID) VALUES (?,'Notification fixture',?,?,0,1,'TEST')",[recipient,'n-'+recipient.slice(0,12),employee]);
    await x("INSERT INTO SUSER (ID,NAME,USERNAME,ISADMIN,STATUS,USERCREATEDID) VALUES (?,'Notification unlinked',?,0,1,'TEST')",[other,'n-'+other.slice(0,12)]);
    await x("INSERT INTO TLENHSUACHUA (ID,NAME,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,'Notification fixture repair',1,'TEST',CURRENT_TIMESTAMP)",[repair]);
    await x("INSERT INTO TPHANCONGNHANVIEN (ID,TLENHSUACHUAID,DNHANVIENID,TILECHIA,PHUTRACHCHINH,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,100,1,1,'TEST',CURRENT_TIMESTAMP)",[assignmentId,repair,employee]);
    const messages=await service.assignments(recipient,q);assert.equal(messages.length,1);assert.equal(messages[0].REPAIRID,repair);
    assert.equal((await service.assignments(other,q)).length,0);
    await x('UPDATE SUSER SET STATUS=0 WHERE ID=?',[recipient]);assert.equal((await service.assignments(recipient,q)).length,0);
    await x('UPDATE SUSER SET STATUS=1 WHERE ID=?',[recipient]);await x('UPDATE TPHANCONGNHANVIEN SET STATUS=0 WHERE ID=?',[assignmentId]);assert.equal((await service.assignments(recipient,q)).length,0);
    throw rollback;
  }),error=>error===rollback);
  assert.equal((await db.query('SELECT ID FROM TPHANCONGNHANVIEN WHERE ID=?',[assignmentId])).length,0);
});
