export function parseRollNumber(roll: string) {
  const year = 2000 + parseInt(roll.slice(0, 2));
  return { admissionYear: year, graduationYear: year + 4, batchBadge: `${year % 100}-${(year + 4) % 100}` };
}
export function buildBadge(username: string, badge: string) { return `${username} {${badge}}`; }
