#!/bin/bash
# End-to-end API test: order → payment → rejection → resubmission → approval → admin cancel w/ restock
set -e
B=http://localhost:3000
CJ=/tmp/hc-admin.cookies
CUST=/tmp/hc-cust.cookies

echo "1) admin login"
curl -s -c $CJ -X POST $B/api/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@tibeb.store","password":"Admin@12345"}' | head -c 120; echo

echo "2) place order (guest)"
OID=$(curl -s -c /tmp/hc-any.cookies -X POST $B/api/orders -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":"PLACEHOLDER","qty":1,"size":"M","color":"Black"}],"customerName":"API Test","phone":"+251933334444","city":"Adama","address":"Test street 5","deliveryZoneId":"PLACEHOLDER"}')
# fetch real ids
PID=$(curl -s "$B/api/products?perPage=1&sort=newest" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d).items[0];console.log(p.id+'|'+p.sizes.split(',')[0].trim()+'|'+encodeURIComponent(JSON.parse(p.colors)[0].name))})")
PRODID=$(echo "$PID" | cut -d'|' -f1)
PSIZE=$(echo "$PID" | cut -d'|' -f2)
PCOLOR=$(echo "$PID" | cut -d'|' -f3)
ZID=$(node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
db.deliveryZone.findFirst({where:{active:true}}).then(z=>{console.log(z.id);return db.\$disconnect()})")
ORD=$(curl -s -X POST $B/api/orders -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PID\",\"qty\":1,\"size\":\"M\",\"color\":\"Black\"}],\"customerName\":\"API Test\",\"phone\":\"+251933334444\",\"city\":\"Adama\",\"address\":\"Test street 5\",\"deliveryZoneId\":\"$ZID\"}")
echo "$ORD"
ONUM=$(echo "$ORD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).orderNumber))")

echo "3) upload payment screenshot"
curl -s -X POST "$B/api/orders/$ONUM/payment" \
  -F "screenshot=@/home/z/my-project/scripts/test-screenshot.png;type=image/png" \
  -F "methodName=Telebirr" -F "transactionRef=API-REF-991" -F "payerName=API Test" -F "amount=999999" | head -c 200; echo

echo "4) find payment id + reject"
PAYID=$(curl -s -b $CJ "$B/api/admin/payments?status=PENDING" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d).payments.find(x=>x.order.orderNumber==='$ONUM');console.log(p.id)})")
curl -s -b $CJ -X PATCH "$B/api/admin/payments/$PAYID" -H 'Content-Type: application/json' \
  -d '{"action":"REJECT","reason":"Test transaction number not found"}' | head -c 100; echo

echo "5) tracking shows rejection?"
curl -s "$B/api/track?orderNumber=$ONUM&phone=%2B251933334444" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d).order;console.log('paymentStatus:',o.paymentStatus,'| reason:',o.payment.rejectionReason)})"

echo "6) resubmit + approve"
curl -s -X POST "$B/api/orders/$ONUM/payment" \
  -F "screenshot=@/home/z/my-project/scripts/test-screenshot.png;type=image/png" \
  -F "methodName=CBE Birr" -F "transactionRef=API-REF-992" -F "payerName=API Test" -F "amount=1" | head -c 100; echo
PAYID2=$(curl -s -b $CJ "$B/api/admin/payments?status=PENDING" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d).payments.find(x=>x.order.orderNumber==='$ONUM');console.log(p.id)})")
curl -s -b $CJ -X PATCH "$B/api/admin/payments/$PAYID2" -H 'Content-Type: application/json' -d '{"action":"APPROVE"}' | head -c 100; echo

echo "7) stock before cancel"
DBURL=$(grep DATABASE_URL /home/z/my-project/.env | cut -d= -f2-)
node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
db.product.findUnique({where:{id:'$PID'},select:{stock:true}}).then(p=>{console.log('stock:',p.stock);return db.\$disconnect()})"

echo "8) admin cancels order (restock expected)"
ORDERID=$(curl -s -b $CJ "$B/api/admin/orders?q=$ONUM" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).orders[0].id))")
curl -s -b $CJ -X PATCH "$B/api/admin/orders/$ORDERID" -H 'Content-Type: application/json' -d '{"status":"CANCELLED"}' | head -c 80; echo

echo "9) stock after cancel (+1 expected)"
node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
db.product.findUnique({where:{id:'$PID'},select:{stock:true}}).then(p=>{console.log('stock:',p.stock);return db.\$disconnect()})"

echo "10) audit log latest"
curl -s -b $CJ "$B/api/admin/audit" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{JSON.parse(d).logs.slice(0,4).forEach(l=>console.log('-',l.action,'|',l.details))})"

echo "11) non-admin blocked from admin API (expect 403)"
curl -s -o /dev/null -w "%{http_code}\n" "$B/api/admin/stats"

echo "12) private screenshot blocked for anon (expect 403)"
F=$(ls /home/z/my-project/uploads/payments | head -1)
curl -s -o /dev/null -w "%{http_code}\n" "$B/api/files/payments/$F"
