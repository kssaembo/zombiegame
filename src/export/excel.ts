import type { SheetData } from 'write-excel-file/browser';
import type { GameLog, Student } from '../types';
import { logRows, statusOf } from '../game/rules';

const headerStyle = {
  fontWeight: 'bold' as const,
  backgroundColor: '#EDE9FE',
  textColor: '#312E81',
  align: 'center' as const,
  wrap: true,
};

function styledSheet(rows: Array<Array<string | number>>): SheetData {
  return rows.map((row, rowIndex) => row.map(value => rowIndex === 0 ? { value, ...headerStyle } : value));
}

export function createWorkbookSheets(logs: GameLog[], students: Student[], currentRound: number) {
  const logData = styledSheet(logRows(logs));
  const summaryData = styledSheet([
    ['학생 ID', '학생명', '현재 상태', '누적승점', '최초감염자', '현재 라운드'],
    ...students.map(student => [
      student.id,
      student.name,
      statusOf(student),
      student.points,
      student.isOriginalZombie ? 'O' : 'X',
      currentRound,
    ]),
  ]);

  return [
    {
      data: logData,
      sheet: '게임 로그',
      columns: [8, 14, 20, 16, 18, 18, 14, 14, 20, 16, 18, 18, 14, 14, 14, 14, 48, 26].map(width => ({ width })),
      stickyRowsCount: 1,
      orientation: 'landscape' as const,
    },
    {
      data: summaryData,
      sheet: '학생 현황',
      columns: [22, 18, 14, 12, 14, 12].map(width => ({ width })),
      stickyRowsCount: 1,
    },
  ];
}

function localDateStamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function downloadGameWorkbook(logs: GameLog[], students: Student[], currentRound: number) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const workbook = writeExcelFile(createWorkbookSheets(logs, students, currentRound), {
    fontFamily: 'Arial',
    fontSize: 11,
  });
  await workbook.toFile(`바이러스게임_결과_${localDateStamp(new Date())}.xlsx`);
}
