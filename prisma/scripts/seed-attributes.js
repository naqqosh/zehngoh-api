/* eslint-disable no-console */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

// Helper upserts
async function upsertAttribute({ nameUz, nameRu, type, useInSku }) {
  // Try find by both names
  let attr = await prisma.attribute.findFirst({ where: { nameUz, nameRu } });
  if (attr) {
    attr = await prisma.attribute.update({ where: { id: attr.id }, data: { type, useInSku } });
  } else {
    attr = await prisma.attribute.create({ data: { nameUz, nameRu, type, useInSku: !!useInSku } });
  }
  return attr;
}

async function upsertValue(attributeId, { nameUz, nameRu, skuCode, color }) {
  // Prefer to match by (attributeId, nameUz)
  let val = await prisma.attributeValue.findFirst({ where: { attributeId, nameUz } });
  if (val) {
    val = await prisma.attributeValue.update({ where: { id: val.id }, data: { nameRu, skuCode: skuCode || null, color: color || null } });
  } else {
    val = await prisma.attributeValue.create({ data: { attributeId, nameUz, nameRu, skuCode, color } });
  }
  return val;
}

async function seedColors() {
  const attr = await upsertAttribute({ nameUz: 'Rang', nameRu: 'Цвет', type: 'color', useInSku: true });
  const values = [
    ['Alvon','Алый','ALVON','#E32636'],
    ['Ametist','Аметист','AMETIST','#9966CC'],
    ["To'q qizil",'Темно-красный','TOQQIZIL','#8B0000'],
    ["Sarg'ish",'Желтоватый','SARGISH','#F5DE7A'],
    ["Sarg'ish melanj",'Желтый меланж','SARGMEL','#F3E7A1'],
    ['Oq','Белый','OQ','#FFFFFF'],
    ['Feruza','Бирюзовый','FERUZA','#40E0D0'],
    ['Bronza','Бронзовый','BRONZA','#CD7F32'],
    ['Olcharang','Бордовый','OLCHA','#800020'],
    ['Moviy','Синий','MOVIY','#1E90FF'],
    ['Xantal','Горчичный','XANTAL','#FFDB58'],
    ['Sariq','Желтый','SARIQ','#FFD700'],
    ['Yashil','Зеленый','YASHIL','#008000'],
    ['Yashil xaki','Зеленый хаки','YAXAKI','#78866B'],
    ['Tilla xaki','Золотой хаки','TILXAKI','#C0A46B'],
    ['Tilla','Золотой','TILLA','#DAA520'],
    ['Indigo','Индиго','INDIGO','#4B0082'],
    ['Karamel','Карамельный','KARAMEL','#C68E17'],
    ['Konfetrang','Конфетный','KONFET','#FF6F91'],
    ['Korali pushti','Кораллово-розовый','KORPUS','#F88379'],
    ['Korali','Коралловый','KORALI','#FF7F50'],
    ['Korali melanj','Коралловый меланж','KORMEL','#FF9A8A'],
    ['Jigarrang','Коричневый','JIGAR','#8B4513'],
    ['Qizil','Красный','QIZIL','#FF0000'],
    ["Qaymoq rang",'Кремовый','QAYMOQ','#FFFDD0'],
    ['Lavanda','Лавандовый','LAVANDA','#E6E6FA'],
    ['Havorang','Голубой','HAVO','#87CEEB'],
    ['Laym','Лайм','LAYM','#32CD32'],
    ['Muz','Ледяной','MUZ','#E0F7FA'],
    ["Yashil o'rmon rangi",'Лесной зеленый','YASHORM','#228B22'],
    ['Limon rang','Лимонный','LIMON','#FFF44F'],
    ['Mango','Манго','MANGO','#FFC324'],
    ['Marsala','Марсала','MARSALA','#964F4C'],
    ['Mis rang','Медный','MIS','#B87333'],
    ['Oqish rang','Молочный','OQISH','#F5F5F5'],
    ['Dengiz rangi','Морская волна','DENGIZ','#20B2AA'],
    ['Yalpiz','Мята','YALPIZ','#98FF98'],
    ['Moviy osmon rangi','Небесно-голубой','OSMON','#87CEFA'],
    ['Zaytun','Оливковый','ZAYTUN','#808000'],
    ['Sabzirang','Морковный','SABZI','#ED9121'],
    ['Pastel marjon','Пастельно-коралловый','PMARJON','#F8AD9D'],
    ["Qumrang xaki",'Песочный хаки','QUMXAKI','#C2B280'],
    ['Xira xaki','Приглушенный хаки','XIRAX','#9A8F70'],
    ['Shaffof','Прозрачный','SHAFFOF',null],
    ['Pudra rang','Пудровый','PUDRA','#F3D3D3'],
    ['Siyohrang','Синеватый','SIYOH','#0F3057'],
    ['Pushti','Розовый','PUSHTI','#FFC0CB'],
    ['Malla','Рыжий','MALLA','#B5651D'],
    ['Och yashil','Светло-зеленый','OYASHIL','#90EE90'],
    ["Och sarg'ish",'Светло-желтоватый','OSARG','#FFF9C4'],
    ['Och sariq','Светло-желтый','OSARIQ','#FFF59D'],
    ['Och jigarrang','Светло-коричневый','OJIGAR','#CD853F'],
    ['Och sabzirang','Светло-морковный','OSABZI','#FFA64D'],
    ['Och ko\'k','Светло-синий','OKOK','#ADD8E6'],
    ['Kumush rang','Серебряный','KUMUSH','#C0C0C0'],
    ['Kulrang','Серый','KULRANG','#808080'],
    ['Kulrang melanj','Серый меланж','KULMEL','#B0B0B0'],
    ['Metall kulrang','Металлический серый','MKUL','#8A8F8F'],
    ['Ko\'k','Синий','KOK','#0000FF'],
    ['Ko\'k melanj','Синий меланж','KOKMEL','#4F6D7A'],
    ['Siren rang','Сиреневый','SIREN','#C8A2C8'],
    ['Fil suyagi','Слоновая кость','FIL','#FFFFF0'],
    ["To'q ko'k",'Темно-синий','TQKOK','#00008B'],
    ['Terakota','Терракотовый','TERAKOTA','#E2725B'],
    ["To'q feruza",'Темно-бирюзовый','TQFERUZA','#008B8B'],
    ["To'q yashil",'Темно-зеленый','TQYASHIL','#006400'],
    ["To'q jigarrang",'Темно-коричневый','TQJIGAR','#654321'],
    ["To'q pushti",'Темно-розовый','TQPUSHTI','#C71585'],
    ["To'q kulrang",'Темно-серый','TQKUL','#404040'],
    ["Ko'mir rang",'Угольный','KOMIR','#36454F'],
    ['Binafsha','Фиолетовый','BINAFSHA','#800080'],
    ['Fuksiya','Фуксия','FUKSIYA','#FF00FF'],
    ['Xaki','Хаки','XAKI','#F0E68C'],
    ['Xromrang','Хром','XROM','#B8B8B8'],
    ['Qora','Черный','QORA','#000000'],
    ['Shokoladrang','Шоколадный','SHOKO','#7B3F00'],
  ];
  for (const [nameUz, nameRu, skuCode, color] of values) {
    await upsertValue(attr.id, { nameUz, nameRu, skuCode, color });
  }
}

function sizeList(list) { return list.map((x) => [String(x), String(x)]); }

async function seedSizes() {
  // Women clothing size EUR
  let attr = await upsertAttribute({ nameUz: "Ayollar uchun jinslar o'lchami EUR", nameRu: 'Женские размеры одежды EUR', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['32','34','36','38','40','42','44','46','48','50','52'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `W${uz}` });
  }

  // Women clothing size RUS
  attr = await upsertAttribute({ nameUz: "Ayollar uchun jinslar o'lchami RUS", nameRu: 'Женские размеры одежды RUS', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['40','42','44','46','48','50','52','54','56','58'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `WR${uz}` });
  }

  // Men clothing size EUR
  attr = await upsertAttribute({ nameUz: "Erkaklar uchun jinslar o'lchami EUR", nameRu: 'Мужские размеры одежды EUR', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['44','46','48','50','52','54','56','58','60'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `M${uz}` });
  }

  // Men clothing size RUS
  attr = await upsertAttribute({ nameUz: "Erkaklar uchun jinslar o'lchami RUS", nameRu: 'Мужские размеры одежды RUS', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['44','46','48','50','52','54','56','58','60','62'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `MR${uz}` });
  }

  // General clothing size (international)
  attr = await upsertAttribute({ nameUz: "Kiyim o'lchami", nameRu: 'Размер одежды', type: 'select', useInSku: true });
  for (const [uz, ru, code] of [['XS','XS','XS'], ['S','S','S'], ['M','M','M'], ['L','L','L'], ['XL','XL','XL'], ['XXL','XXL','2XL']]) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: code });
  }

  // Ring sizes
  attr = await upsertAttribute({ nameUz: 'Uzuk o\'lchamlari', nameRu: 'Размеры колец', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['14','15','16','17','18','19','20','21','22'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `R${uz}` });
  }

  // Ring length (mm)
  attr = await upsertAttribute({ nameUz: "Uzuk uzunligi bo'yicha o'lchamlari, mm", nameRu: 'Размеры по длине кольца, мм', type: 'select', useInSku: false });
  for (const [uz, ru] of sizeList(['45','47','49','51','53','55','57','59','61'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru });
  }

  // Headwear sizes
  attr = await upsertAttribute({ nameUz: 'Bosh kiyim o\'lchamlari', nameRu: 'Размеры головных уборов', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['54','55','56','57','58','59','60','61','62'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `H${uz}` });
  }

  // Belt sizes (cm)
  attr = await upsertAttribute({ nameUz: 'Kamar o\'lchamlari', nameRu: 'Размеры ремней', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['85','90','95','100','105','110','115','120'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `B${uz}` });
  }

  // Men shirt collar (cm)
  attr = await upsertAttribute({ nameUz: 'Erkaklar ko\'ylagi yoqasi o\'lchami', nameRu: 'Размер воротника мужской рубашки', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['37','38','39','40','41','42','43','44','45'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `C${uz}` });
  }

  // Age-based children clothing size (years)
  attr = await upsertAttribute({ nameUz: 'Yoshga qarab bolalar kiyimining o\'lchami', nameRu: 'Детские размеры по возрасту', type: 'select', useInSku: true });
  for (const [uz, ru] of [['0-1','0-1'], ['1-2','1-2'], ['2-3','2-3'], ['3-4','3-4'], ['4-5','4-5'], ['5-6','5-6'], ['6-7','6-7'], ['7-8','7-8'], ['8-9','8-9'], ['9-10','9-10']]) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `AGE${uz.replace(/[^0-9]/g,'')}` });
  }

  // Women bra sizes (band-cup simplified)
  attr = await upsertAttribute({ nameUz: 'Ayollar byustgalterlarini o\'lchamlari', nameRu: 'Размеры бюстгальтеров', type: 'select', useInSku: true });
  for (const [uz, ru, code] of [['70A','70A','70A'],['75B','75B','75B'],['80B','80B','80B'],['85C','85C','85C'],['90D','90D','90D']]) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: code });
  }

  // Socks sizes
  attr = await upsertAttribute({ nameUz: 'Paypoq o\'lchamlari', nameRu: 'Размеры носков', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['23-25','25-27','27-29','29-31'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `S${uz.replace(/\D/g,'')}` });
  }

  // Children shoe sizes (EU)
  attr = await upsertAttribute({ nameUz: 'Bolalar poyabzali o\'lchami', nameRu: 'Детские размеры обуви (EU)', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['24','25','26','27','28','29','30','31','32','33','34','35'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `CS${uz}` });
  }

  // Children clothing size (height-based cm)
  attr = await upsertAttribute({ nameUz: 'Bolalar kiyimining bo\'yi bo\'yicha o\'lchami', nameRu: 'Детские размеры по росту (см)', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['86','92','98','104','110','116','122','128','134','140','146'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `H${uz}` });
  }

  // Clothing size RUS (generic)
  attr = await upsertAttribute({ nameUz: "Kiyim o'lchami RUS", nameRu: 'Размер одежды RUS', type: 'select', useInSku: true });
  for (const [uz, ru] of sizeList(['40','42','44','46','48','50','52','54','56','58','60'])) {
    await upsertValue(attr.id, { nameUz: uz, nameRu: ru, skuCode: `R${uz}` });
  }
}

async function main() {
  await seedColors();
  await seedSizes();
  console.log('Attributes seeding finished');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
