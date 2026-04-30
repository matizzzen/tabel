import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type DayValue } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const YEAR = new Date().getFullYear();
const MONTH = new Date().getMonth() + 1;
const DAYS_IN_MONTH = new Date(YEAR, MONTH, 0).getDate();

function dayPattern(day: number): DayValue {
  const date = new Date(YEAR, MONTH - 1, day);
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return "ABSENT";
  const r = Math.random();
  if (r < 0.05) return "SICK";
  if (r < 0.10) return "HALF";
  if (r < 0.15) return "THREE_QUARTERS";
  return "FULL";
}

async function main() {
  const hash = await bcrypt.hash("password", 10);

  const [objA, objB] = await Promise.all([
    prisma.object.upsert({ where: { name: "ЖК Северный" }, update: {}, create: { name: "ЖК Северный" } }),
    prisma.object.upsert({ where: { name: "ТЦ Радуга" },   update: {}, create: { name: "ТЦ Радуга" } }),
  ]);

  const [director, b1, b2, b3, b4] = await Promise.all([
    prisma.user.upsert({
      where: { login: "director" }, update: {},
      create: { login: "director", passwordHash: hash, fullName: "Директор Главный", role: "DIRECTOR" },
    }),
    prisma.user.upsert({
      where: { login: "brigadir1" }, update: {},
      create: { login: "brigadir1", passwordHash: hash, fullName: "Иванов Иван Иванович", role: "FOREMAN", objectId: objA.id },
    }),
    prisma.user.upsert({
      where: { login: "brigadir2" }, update: {},
      create: { login: "brigadir2", passwordHash: hash, fullName: "Петров Пётр Петрович", role: "FOREMAN", objectId: objA.id },
    }),
    prisma.user.upsert({
      where: { login: "brigadir3" }, update: {},
      create: { login: "brigadir3", passwordHash: hash, fullName: "Сидоров Сидор Сидорович", role: "FOREMAN", objectId: objA.id },
    }),
    prisma.user.upsert({
      where: { login: "brigadir4" }, update: {},
      create: { login: "brigadir4", passwordHash: hash, fullName: "Козлов Андрей Викторович", role: "FOREMAN", objectId: objB.id },
    }),
  ]);

  void director;

  const positionNames = ["Каменщик", "Бетонщик", "Электрик", "Сварщик", "Разнорабочий", "Штукатур", "Плотник"];
  const deptNames = ["СМУ-1", "СМУ-2", "Электромонтажный участок"];

  async function setupForeman(userId: string) {
    const positions = await Promise.all(
      positionNames.map((name) =>
        prisma.position.upsert({ where: { name_userId: { name, userId } }, update: {}, create: { name, userId } })
      )
    );
    const depts = await Promise.all(
      deptNames.map((name) =>
        prisma.department.upsert({ where: { name_userId: { name, userId } }, update: {}, create: { name, userId } })
      )
    );
    return { positions, depts };
  }

  const [f1, f2, f3, f4] = await Promise.all([
    setupForeman(b1.id),
    setupForeman(b2.id),
    setupForeman(b3.id),
    setupForeman(b4.id),
  ]);

  type EmpDef = { fullName: string; pi: number; di: number; rate: number };

  const empDefs: Record<string, EmpDef[]> = {
    b1: [
      { fullName: "Алексеев Алексей Алексеевич",   pi: 0, di: 0, rate: 2800 },
      { fullName: "Борисов Борис Борисович",        pi: 0, di: 0, rate: 2800 },
      { fullName: "Викторов Виктор Викторович",     pi: 1, di: 0, rate: 2600 },
      { fullName: "Григорьев Григорий Григорьевич", pi: 1, di: 1, rate: 2600 },
      { fullName: "Дмитриев Дмитрий Дмитриевич",   pi: 2, di: 2, rate: 3200 },
      { fullName: "Евгеньев Евгений Евгеньевич",    pi: 5, di: 0, rate: 2400 },
    ],
    b2: [
      { fullName: "Жуков Жан Жанович",              pi: 3, di: 1, rate: 3000 },
      { fullName: "Зимин Захар Захарович",           pi: 3, di: 1, rate: 3000 },
      { fullName: "Игнатьев Игорь Игоревич",         pi: 4, di: 0, rate: 2200 },
      { fullName: "Кириллов Кирилл Кириллович",      pi: 4, di: 1, rate: 2200 },
      { fullName: "Лаврентьев Лавр Лаврентьевич",   pi: 6, di: 0, rate: 2500 },
      { fullName: "Макаров Макар Макарович",         pi: 0, di: 2, rate: 2800 },
    ],
    b3: [
      { fullName: "Никитин Никита Никитич",          pi: 1, di: 0, rate: 2600 },
      { fullName: "Олегов Олег Олегович",            pi: 2, di: 2, rate: 3200 },
      { fullName: "Павлов Павел Павлович",           pi: 5, di: 1, rate: 2400 },
      { fullName: "Романов Роман Романович",         pi: 6, di: 0, rate: 2500 },
      { fullName: "Степанов Степан Степанович",      pi: 3, di: 1, rate: 3000 },
      { fullName: "Тимофеев Тимофей Тимофеевич",    pi: 4, di: 0, rate: 2200 },
    ],
    b4: [
      { fullName: "Ульянов Ульян Ульянович",         pi: 0, di: 0, rate: 2800 },
      { fullName: "Фёдоров Фёдор Фёдорович",         pi: 1, di: 1, rate: 2600 },
      { fullName: "Харитонов Харитон Харитонович",   pi: 2, di: 2, rate: 3200 },
      { fullName: "Цветков Цветан Цветанович",       pi: 3, di: 0, rate: 3000 },
      { fullName: "Шустов Шустрый Шустрович",       pi: 4, di: 1, rate: 2200 },
      { fullName: "Щербаков Щедрый Щедрович",       pi: 6, di: 0, rate: 2500 },
    ],
  };

  async function createEmployees(
    data: EmpDef[],
    foremanId: string,
    setup: { positions: { id: string }[]; depts: { id: string }[] }
  ) {
    const results = [];
    for (const e of data) {
      const existing = await prisma.employee.findFirst({ where: { fullName: e.fullName, foremanId } });
      if (existing) { results.push(existing); continue; }
      results.push(await prisma.employee.create({
        data: {
          fullName: e.fullName,
          positionId: setup.positions[e.pi].id,
          departmentId: setup.depts[e.di].id,
          defaultShiftRate: e.rate,
          foremanId,
        },
      }));
    }
    return results;
  }

  const [emps1, emps2, emps3, emps4] = await Promise.all([
    createEmployees(empDefs.b1, b1.id, f1),
    createEmployees(empDefs.b2, b2.id, f2),
    createEmployees(empDefs.b3, b3.id, f3),
    createEmployees(empDefs.b4, b4.id, f4),
  ]);

  async function fillTimesheet(
    foreman: { id: string },
    object: { id: string },
    employees: { id: string }[],
    setup: { positions: { id: string; name: string }[]; depts: { id: string; name: string }[] },
    data: EmpDef[]
  ) {
    const ts = await prisma.timesheet.upsert({
      where: { objectId_createdByUserId_year_month: { objectId: object.id, createdByUserId: foreman.id, year: YEAR, month: MONTH } },
      update: {},
      create: { objectId: object.id, year: YEAR, month: MONTH, createdByUserId: foreman.id },
    });
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const def = data[i];
      const existing = await prisma.timesheetRow.findUnique({
        where: { timesheetId_employeeId: { timesheetId: ts.id, employeeId: emp.id } },
      });
      const row = existing ?? await prisma.timesheetRow.create({
        data: {
          timesheetId: ts.id,
          employeeId: emp.id,
          positionSnapshot: setup.positions[def.pi].name,
          departmentSnapshot: setup.depts[def.di].name,
          shiftRateSnapshot: def.rate,
          objectId: object.id,
        },
      });
      for (let d = 1; d <= DAYS_IN_MONTH; d++) {
        await prisma.timesheetDay.upsert({
          where: { timesheetRowId_day: { timesheetRowId: row.id, day: d } },
          create: { timesheetRowId: row.id, day: d, value: dayPattern(d) },
          update: {},
        });
      }
    }
  }

  await fillTimesheet(b1, objA, emps1, f1, empDefs.b1);
  await fillTimesheet(b2, objA, emps2, f2, empDefs.b2);
  await fillTimesheet(b3, objA, emps3, f3, empDefs.b3);
  await fillTimesheet(b4, objB, emps4, f4, empDefs.b4);

  console.log("Seed complete:", {
    users: await prisma.user.count(),
    objects: await prisma.object.count(),
    employees: await prisma.employee.count(),
    timesheets: await prisma.timesheet.count(),
    days: await prisma.timesheetDay.count(),
  });
  console.log("\nLogins (password: password):");
  console.log("  director / brigadir1 / brigadir2 / brigadir3 / brigadir4");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
