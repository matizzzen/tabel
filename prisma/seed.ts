import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type DayValue } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password", 10);

  const objectNames = ["ЖК Северный", "ТЦ Радуга", "Склад №3"];
  const [objA, objB] = await Promise.all(
    objectNames.map((name) =>
      prisma.object.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const [admin, , brigadir1, brigadir2] = await Promise.all([
    prisma.user.upsert({
      where: { login: "admin" },
      update: {},
      create: { login: "admin", passwordHash, fullName: "Администратор", role: "ADMIN" },
    }),
    prisma.user.upsert({
      where: { login: "director" },
      update: {},
      create: { login: "director", passwordHash, fullName: "Директор", role: "DIRECTOR" },
    }),
    prisma.user.upsert({
      where: { login: "brigadir1" },
      update: {},
      create: {
        login: "brigadir1",
        passwordHash,
        fullName: "Иванов Иван Иванович",
        role: "FOREMAN",
        objectId: objA.id,
      },
    }),
    prisma.user.upsert({
      where: { login: "brigadir2" },
      update: {},
      create: {
        login: "brigadir2",
        passwordHash,
        fullName: "Петров Пётр Петрович",
        role: "FOREMAN",
        objectId: objB.id,
      },
    }),
  ]);

  void admin;

  const positionNames = ["Каменщик", "Бетонщик", "Электрик", "Сварщик", "Разнорабочий"];
  const deptNames = ["СМУ-1", "СМУ-2", "Электромонтажный участок"];

  async function createPositionsFor(userId: string) {
    return Promise.all(
      positionNames.map((name) =>
        prisma.position.upsert({
          where: { name_userId: { name, userId } },
          update: {},
          create: { name, userId },
        })
      )
    );
  }

  async function createDepartmentsFor(userId: string) {
    return Promise.all(
      deptNames.map((name) =>
        prisma.department.upsert({
          where: { name_userId: { name, userId } },
          update: {},
          create: { name, userId },
        })
      )
    );
  }

  const [posB1, posB2] = await Promise.all([
    createPositionsFor(brigadir1.id),
    createPositionsFor(brigadir2.id),
  ]);

  const [deptsB1, deptsB2] = await Promise.all([
    createDepartmentsFor(brigadir1.id),
    createDepartmentsFor(brigadir2.id),
  ]);

  // employees 0-4 → brigadir1, 5-9 → brigadir2
  const employeesDataB1 = [
    { fullName: "Сидоров Алексей Николаевич",  positionIdx: 0, deptIdx: 0, rate: 2800 },
    { fullName: "Кузнецов Михаил Сергеевич",    positionIdx: 0, deptIdx: 0, rate: 2800 },
    { fullName: "Васильев Дмитрий Олегович",    positionIdx: 1, deptIdx: 0, rate: 2600 },
    { fullName: "Новиков Андрей Викторович",    positionIdx: 1, deptIdx: 1, rate: 2600 },
    { fullName: "Морозов Сергей Александрович", positionIdx: 2, deptIdx: 2, rate: 3200 },
  ];

  const employeesDataB2 = [
    { fullName: "Волков Игорь Павлович",        positionIdx: 2, deptIdx: 2, rate: 3200 },
    { fullName: "Соловьёв Артём Юрьевич",       positionIdx: 3, deptIdx: 1, rate: 3000 },
    { fullName: "Зайцев Николай Владимирович",  positionIdx: 3, deptIdx: 1, rate: 3000 },
    { fullName: "Орлов Павел Геннадьевич",      positionIdx: 4, deptIdx: 0, rate: 2200 },
    { fullName: "Лебедев Виктор Анатольевич",   positionIdx: 4, deptIdx: 1, rate: 2200 },
  ];

  async function createEmployeesFor(
    data: { fullName: string; positionIdx: number; deptIdx: number; rate: number }[],
    foremanId: string,
    positions: typeof posB1,
    departments: typeof deptsB1
  ) {
    const results = [];
    for (const e of data) {
      const existing = await prisma.employee.findFirst({ where: { fullName: e.fullName, foremanId } });
      if (existing) { results.push(existing); continue; }
      results.push(
        await prisma.employee.create({
          data: {
            fullName: e.fullName,
            positionId: positions[e.positionIdx].id,
            departmentId: departments[e.deptIdx].id,
            defaultShiftRate: e.rate,
            foremanId,
          },
        })
      );
    }
    return results;
  }

  const [empB1, empB2] = await Promise.all([
    createEmployeesFor(employeesDataB1, brigadir1.id, posB1, deptsB1),
    createEmployeesFor(employeesDataB2, brigadir2.id, posB2, deptsB2),
  ]);

  const year = 2026;
  const month = 4;

  const tsA = await prisma.timesheet.upsert({
    where: { objectId_createdByUserId_year_month: { objectId: objA.id, createdByUserId: brigadir1.id, year, month } },
    update: {},
    create: { objectId: objA.id, year, month, createdByUserId: brigadir1.id },
  });

  const tsB = await prisma.timesheet.upsert({
    where: { objectId_createdByUserId_year_month: { objectId: objB.id, createdByUserId: brigadir2.id, year, month } },
    update: {},
    create: { objectId: objB.id, year, month, createdByUserId: brigadir2.id },
  });

  async function fillRows(
    timesheetId: string,
    objectId: string,
    emps: { id: string }[],
    dayPattern: DayValue[]
  ) {
    for (const emp of emps) {
      const full = await prisma.employee.findUniqueOrThrow({
        where: { id: emp.id },
        include: { position: true, department: true },
      });
      const existing = await prisma.timesheetRow.findUnique({
        where: { timesheetId_employeeId: { timesheetId, employeeId: emp.id } },
      });
      const row =
        existing ??
        (await prisma.timesheetRow.create({
          data: {
            timesheetId,
            employeeId: emp.id,
            positionSnapshot: full.position.name,
            departmentSnapshot: full.department.name,
            shiftRateSnapshot: full.defaultShiftRate,
            objectId,
          },
        }));
      for (let d = 1; d <= 15; d++) {
        const value = dayPattern[(d - 1) % dayPattern.length];
        await prisma.timesheetDay.upsert({
          where: { timesheetRowId_day: { timesheetRowId: row.id, day: d } },
          create: { timesheetRowId: row.id, day: d, value },
          update: { value },
        });
      }
    }
  }

  await fillRows(tsA.id, objA.id, empB1, ["FULL", "FULL", "ABSENT", "FULL", "FULL", "FULL", "ABSENT"]);
  await fillRows(tsB.id, objB.id, empB2, ["FULL", "HALF", "FULL", "FULL", "ABSENT", "FULL", "FULL"]);

  const counts = {
    users: await prisma.user.count(),
    positions: await prisma.position.count(),
    objects: await prisma.object.count(),
    departments: await prisma.department.count(),
    employees: await prisma.employee.count(),
    timesheets: await prisma.timesheet.count(),
    timesheetRows: await prisma.timesheetRow.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
