// const fs = require("fs");
// const path = require("path");

// // ================= CONFIG =================
// const NIGHT_SHIFT_BADGE_IDS = [
// 	"1001",
// 	"1002",
// 	"1003",
// 	"1006",
// 	"1011",
// 	"1014",
// 	"1018",
// 	"1019",
// 	"1021",
// 	"1022",
// 	"1023",
// 	"1025",
// 	"1029",
// 	"1031",
// 	"1033",
// 	"1034",
// 	"1040",
// 	"1045",
// 	"1048",
// 	"1053",
// 	"1061",
// 	"1064",
// 	"1066",
// 	"1072",
// ];

// // New: these 1000–1999 employees should now be treated as REGULAR (not day or night shift).
// // Fill this with the actual IDs that moved.
// const REGULAR_SHIFT_OVERRIDES = [
// 	// "1015","1025",  // Example placeholders – replace with real list
// ];

// // Gap-based absence configuration for night shifts
// const GLOBAL_MAX_PLANNED_OFF_CONSECUTIVE = 2;

// // Standard schedule constants
// const SHIFT_DAY_START = "07:00:00";
// const SHIFT_DAY_END = "19:00:00";
// const REGULAR_START = "08:30:00";
// const REGULAR_END = "17:30:00";
// const SATURDAY_END = "12:30:00";

// // ================ HELPERS =================
// function getDate(ts) {
// 	return ts?.split(" ")[0] || null;
// }
// function parseTime(ts) {
// 	if (!ts) return null;
// 	return new Date(ts.replace(" ", "T"));
// }
// function hoursDiff(a, b) {
// 	return (b - a) / (1000 * 60 * 60);
// }
// function minutesDiff(a, b) {
// 	return (b - a) / (1000 * 60);
// }
// function getWeekday(dateStr) {
// 	return new Date(dateStr).getDay();
// }
// function addDays(dateStr, d) {
// 	const dt = new Date(dateStr);
// 	dt.setDate(dt.getDate() + d);
// 	return dt.toISOString().slice(0, 10);
// }
// function daysBetween(a, b) {
// 	return Math.floor((new Date(b) - new Date(a)) / 86400000);
// }

// // Central classification
// function classifyEmployee(badge_id) {
// 	// Explicit regular override has highest precedence
// 	if (REGULAR_SHIFT_OVERRIDES.includes(badge_id)) {
// 		return "regular";
// 	}
// 	const n = +badge_id;
// 	if (n >= 1000 && n <= 1999) {
// 		if (NIGHT_SHIFT_BADGE_IDS.includes(badge_id)) return "night";
// 		// Not night and not overridden -> day shift
// 		return "day_shift";
// 	}
// 	return "regular";
// }

// // Day shift / regular scheduled times (night shift handled separately)
// function scheduledTimes(empType, date) {
// 	if (empType === "day_shift") {
// 		const start = new Date(`${date}T${SHIFT_DAY_START}`);
// 		const end = new Date(`${date}T${SHIFT_DAY_END}`);
// 		return {
// 			schedType: "day",
// 			schedStart: start,
// 			schedEnd: end,
// 			standardHours: 12,
// 		};
// 	} else if (empType === "regular") {
// 		const wd = getWeekday(date);
// 		if (wd === 0) return null; // Sunday off
// 		const start = new Date(`${date}T${REGULAR_START}`);
// 		const end = new Date(`${date}T${wd === 6 ? SATURDAY_END : REGULAR_END}`);
// 		return {
// 			schedType: "regular",
// 			schedStart: start,
// 			schedEnd: end,
// 			standardHours: hoursDiff(start, end),
// 		};
// 	}
// 	return null;
// }

// // Anchor date calculation for day shift employees (not night, not regular)
// function computeDayShiftAnchorDate(punches) {
// 	if (!punches.length) return null;
// 	let minDate = null;
// 	punches.forEach((p) => {
// 		const d = getDate(p.Timestamp);
// 		if (!minDate || d < minDate) minDate = d;
// 	});
// 	return minDate;
// }

// // ============== LOAD DATA ==============
// const attendancePath = path.join(__dirname, "attendance.json");
// const employeePath = path.join(__dirname, "employees.json");

// let attendanceRaw = fs.readFileSync(attendancePath, "utf8").trim();
// let employeesRaw = fs.readFileSync(employeePath, "utf8").trim();

// if (!attendanceRaw.startsWith("[")) attendanceRaw = "[" + attendanceRaw;
// if (!attendanceRaw.endsWith("]")) attendanceRaw += "]";
// if (!employeesRaw.startsWith("[")) employeesRaw = "[" + employeesRaw;
// if (!employeesRaw.endsWith("]")) employeesRaw += "]";

// const attendance = JSON.parse(attendanceRaw);
// const employees = JSON.parse(employeesRaw);

// const badgeIdToEmployee = {};
// employees.forEach((e) => {
// 	if (e.badge_id) badgeIdToEmployee[e.badge_id] = e;
// });

// const attendanceByUser = {};
// attendance.forEach((r) => {
// 	if (!r.UserID || !r.Timestamp) return;
// 	(attendanceByUser[r.UserID] ||= []).push(r);
// });

// // Build global date range (for day & regular employees)
// const allDatesSet = new Set();
// attendance.forEach((r) => {
// 	const d = getDate(r.Timestamp);
// 	if (d) allDatesSet.add(d);
// });
// const allDates = Array.from(allDatesSet).sort();
// function buildDateRange(dates) {
// 	if (!dates.length) return [];
// 	const start = dates[0],
// 		end = dates[dates.length - 1];
// 	const range = [];
// 	let cur = new Date(start);
// 	const endDt = new Date(end);
// 	while (cur <= endDt) {
// 		range.push(cur.toISOString().slice(0, 10));
// 		cur.setDate(cur.getDate() + 1);
// 	}
// 	return range;
// }
// const dateRange = buildDateRange(allDates);

// // Precompute anchor dates only for day_shift employees
// const dayShiftAnchorByUser = {};
// Object.keys(attendanceByUser).forEach((uid) => {
// 	const empType = classifyEmployee(uid);
// 	if (empType === "day_shift") {
// 		dayShiftAnchorByUser[uid] = computeDayShiftAnchorDate(
// 			attendanceByUser[uid]
// 		);
// 	}
// });

// // ============== REPORT ==============
// const report = [];

// for (const badge_id in badgeIdToEmployee) {
// 	const emp = badgeIdToEmployee[badge_id];
// 	const userId = badge_id;
// 	const empType = classifyEmployee(badge_id);

// 	const punches = (attendanceByUser[userId] || [])
// 		.slice()
// 		.sort((a, b) => parseTime(a.Timestamp) - parseTime(b.Timestamp));

// 	const worked = [];
// 	const forgot = [];
// 	const late_checkins = [];
// 	const extra_hours = [];
// 	const absent_days = [];
// 	const off_days = [];
// 	const unscheduled_shifts = [];

// 	let totalWorkedComplete = 0;
// 	let totalWorkedAuto = 0;
// 	let totalLateHours = 0;

// 	// ---------- NIGHT SHIFT ----------
// 	if (empType === "night") {
// 		const STANDARD_HOURS = 12;
// 		function minutesSinceMidnight(dt) {
// 			return dt.getHours() * 60 + dt.getMinutes();
// 		}

// 		const enriched = punches
// 			.map((p) => ({ ...p, dt: parseTime(p.Timestamp) }))
// 			.sort((a, b) => a.dt - b.dt);

// 		const consumed = new Set();
// 		const shifts = [];

// 		// Pass 1: evening starts
// 		for (let i = 0; i < enriched.length; i++) {
// 			if (consumed.has(i)) continue;
// 			const p = enriched[i];
// 			if (minutesSinceMidnight(p.dt) >= 12 * 60) {
// 				const startDate = p.dt.toISOString().slice(0, 10);
// 				let checkoutIdx = -1;
// 				for (let j = i + 1; j < enriched.length; j++) {
// 					if (consumed.has(j)) continue;
// 					const q = enriched[j];
// 					const qDate = q.dt.toISOString().slice(0, 10);
// 					const dayDiff = daysBetween(startDate, qDate);
// 					if (dayDiff === 0) continue;
// 					if (dayDiff === 1 && minutesSinceMidnight(q.dt) < 12 * 60) {
// 						checkoutIdx = j;
// 						break;
// 					}
// 					if (dayDiff > 1) break;
// 				}

// 				let checkOutDT,
// 					checkOutSrc = "actual",
// 					checkOutRaw = null;
// 				if (checkoutIdx >= 0) {
// 					checkOutDT = enriched[checkoutIdx].dt;
// 					checkOutRaw = enriched[checkoutIdx].Timestamp;
// 					consumed.add(checkoutIdx);
// 				} else {
// 					checkOutDT = new Date(startDate + "T19:00:00");
// 					checkOutDT.setDate(checkOutDT.getDate() + 1);
// 					checkOutDT.setHours(7, 0, 0, 0);
// 					checkOutSrc = "auto";
// 					forgot.push({
// 						type: "forgot_checkout",
// 						date: startDate,
// 						time: p.Timestamp,
// 					});
// 				}

// 				shifts.push({
// 					startDate,
// 					checkInDT: p.dt,
// 					checkOutDT,
// 					checkInSrc: "actual",
// 					checkOutSrc,
// 					checkInRaw: p.Timestamp,
// 					checkOutRaw,
// 				});
// 			}
// 		}

// 		// Pass 2: morning-only (forgot check-in)
// 		for (let i = 0; i < enriched.length; i++) {
// 			if (consumed.has(i)) continue;
// 			const p = enriched[i];
// 			if (minutesSinceMidnight(p.dt) < 12 * 60) {
// 				const morningDate = p.dt.toISOString().slice(0, 10);
// 				const startDate = addDays(morningDate, -1);
// 				if (shifts.some((s) => s.startDate === startDate)) continue;
// 				const checkInDT = new Date(startDate + "T19:00:00");
// 				shifts.push({
// 					startDate,
// 					checkInDT,
// 					checkOutDT: p.dt,
// 					checkInSrc: "auto",
// 					checkOutSrc: "actual",
// 					checkInRaw: null,
// 					checkOutRaw: p.Timestamp,
// 				});
// 				consumed.add(i);
// 				forgot.push({
// 					type: "forgot_checkin",
// 					date: startDate,
// 					time: p.Timestamp,
// 				});
// 			}
// 		}

// 		shifts.sort((a, b) => a.startDate.localeCompare(b.startDate));

// 		// Totals & worked
// 		shifts.forEach((s) => {
// 			if (s.checkInSrc === "actual") {
// 				const nominalStart = new Date(s.startDate + "T19:00:00");
// 				if (s.checkInDT > nominalStart) {
// 					const lm = minutesDiff(nominalStart, s.checkInDT);
// 					late_checkins.push({
// 						date: s.startDate,
// 						time: s.checkInRaw,
// 						minutes: Math.round(lm),
// 					});
// 					totalLateHours += lm / 60;
// 				}
// 			}

// 			let wh = hoursDiff(s.checkInDT, s.checkOutDT);
// 			if (wh < 0 || wh > 20) wh = STANDARD_HOURS;

// 			const fullyActual =
// 				s.checkInSrc === "actual" && s.checkOutSrc === "actual";
// 			if (fullyActual) {
// 				totalWorkedComplete += wh;
// 				totalWorkedAuto += wh;
// 			} else {
// 				totalWorkedAuto += wh;
// 			}

// 			if (wh > STANDARD_HOURS) {
// 				extra_hours.push({
// 					date: s.startDate,
// 					extra_hours: +(wh - STANDARD_HOURS).toFixed(2),
// 				});
// 			}

// 			worked.push({
// 				date: s.startDate,
// 				from: s.checkInRaw,
// 				to: s.checkOutRaw,
// 				worked_hours: wh.toFixed(2),
// 				auto_filled: !fullyActual,
// 				checkin_auto: s.checkInSrc === "auto",
// 				checkout_auto: s.checkOutSrc === "auto",
// 			});
// 		});

// 		// Gap-based absences
// 		if (shifts.length > 1) {
// 			for (let i = 1; i < shifts.length; i++) {
// 				const prev = shifts[i - 1].startDate;
// 				const cur = shifts[i].startDate;
// 				const gapDays = daysBetween(prev, cur);
// 				const missingNights = gapDays - 1;
// 				if (missingNights > GLOBAL_MAX_PLANNED_OFF_CONSECUTIVE) {
// 					for (
// 						let k = GLOBAL_MAX_PLANNED_OFF_CONSECUTIVE + 1;
// 						k <= missingNights;
// 						k++
// 					) {
// 						absent_days.push(addDays(prev, k));
// 					}
// 				}
// 			}
// 		}

// 		// ---------- DAY SHIFT ----------
// 	} else if (empType === "day_shift") {
// 		const anchorDate = dayShiftAnchorByUser[userId] || null;
// 		if (anchorDate) {
// 			for (const date of dateRange) {
// 				if (daysBetween(anchorDate, date) % 2 !== 0) continue; // every other day
// 				const sched = scheduledTimes(empType, date);
// 				if (!sched) continue;

// 				const windowStart = new Date(`${date}T04:00:00`);
// 				const windowEnd = new Date(`${date}T22:00:00`);

// 				const dayPunches = punches
// 					.map((p) => ({ ...p, dt: parseTime(p.Timestamp) }))
// 					.filter((p) => p.dt >= windowStart && p.dt <= windowEnd)
// 					.sort((a, b) => a.dt - b.dt);

// 				if (dayPunches.length === 0) {
// 					absent_days.push(date);
// 					continue;
// 				}

// 				const sessions = [];
// 				let j = 0;
// 				while (j < dayPunches.length) {
// 					const s = dayPunches[j],
// 						e = dayPunches[j + 1];
// 					if (!e) {
// 						const distStart = Math.abs(s.dt - sched.schedStart);
// 						const distEnd = Math.abs(s.dt - sched.schedEnd);
// 						const schedDur = sched.schedEnd - sched.schedStart;
// 						if (distEnd < distStart && distEnd < schedDur * 0.25) {
// 							sessions.push([null, s]);
// 							forgot.push({ type: "forgot_checkin", date, time: s.Timestamp });
// 						} else {
// 							sessions.push([s, null]);
// 							forgot.push({ type: "forgot_checkout", date, time: s.Timestamp });
// 						}
// 						j += 1;
// 					} else {
// 						sessions.push([s, e]);
// 						j += 2;
// 					}
// 				}

// 				let dayComplete = 0,
// 					dayAuto = 0,
// 					lateMin = 0;
// 				sessions.forEach(([s, e], idx) => {
// 					const inDT = s ? s.dt : sched.schedStart;
// 					const outDT = e ? e.dt : sched.schedEnd;
// 					if (idx === 0 && s && inDT > sched.schedStart) {
// 						const lm = minutesDiff(sched.schedStart, inDT);
// 						lateMin += lm;
// 						late_checkins.push({
// 							date,
// 							time: s.Timestamp,
// 							minutes: Math.round(lm),
// 						});
// 					}
// 					const wh = hoursDiff(inDT, outDT);
// 					if (s && e) {
// 						dayComplete += wh;
// 						dayAuto += wh;
// 					} else {
// 						dayAuto += wh;
// 					}
// 					worked.push({
// 						date,
// 						from: s ? s.Timestamp : null,
// 						to: e ? e.Timestamp : null,
// 						worked_hours: wh.toFixed(2),
// 						auto_filled: !(s && e),
// 					});
// 				});

// 				if (dayComplete > sched.standardHours) {
// 					extra_hours.push({
// 						date,
// 						extra_hours: +(dayComplete - sched.standardHours).toFixed(2),
// 					});
// 				}
// 				totalWorkedComplete += dayComplete;
// 				totalWorkedAuto += dayAuto;
// 				totalLateHours += lateMin / 60;
// 			}
// 		}

// 		// ---------- REGULAR (includes override 1000–1999 moved to regular) ----------
// 	} else {
// 		for (const date of dateRange) {
// 			const sched = scheduledTimes(empType, date);
// 			if (!sched) continue;

// 			const dayPunches = punches
// 				.filter((p) => getDate(p.Timestamp) === date)
// 				.sort((a, b) => parseTime(a.Timestamp) - parseTime(b.Timestamp));

// 			if (dayPunches.length === 0) {
// 				absent_days.push(date);
// 				continue;
// 			}

// 			const sessions = [];
// 			let j = 0;
// 			while (j < dayPunches.length) {
// 				const s = dayPunches[j],
// 					e = dayPunches[j + 1];
// 				if (!e) {
// 					const dt = parseTime(s.Timestamp);
// 					const distStart = Math.abs(dt - sched.schedStart);
// 					const distEnd = Math.abs(dt - sched.schedEnd);
// 					const schedDur = sched.schedEnd - sched.schedStart;
// 					if (distEnd < distStart && distEnd < schedDur * 0.25) {
// 						sessions.push([null, s]);
// 						forgot.push({ type: "forgot_checkin", date, time: s.Timestamp });
// 					} else {
// 						sessions.push([s, null]);
// 						forgot.push({ type: "forgot_checkout", date, time: s.Timestamp });
// 					}
// 					j += 1;
// 				} else {
// 					sessions.push([s, e]);
// 					j += 2;
// 				}
// 			}

// 			let dayComplete = 0,
// 				dayAuto = 0,
// 				lateMin = 0;
// 			sessions.forEach(([s, e], idx) => {
// 				const inDT = s ? parseTime(s.Timestamp) : sched.schedStart;
// 				const outDT = e ? parseTime(e.Timestamp) : sched.schedEnd;
// 				if (idx === 0 && s && inDT > sched.schedStart) {
// 					const lm = minutesDiff(sched.schedStart, inDT);
// 					lateMin += lm;
// 					late_checkins.push({
// 						date,
// 						time: s.Timestamp,
// 						minutes: Math.round(lm),
// 					});
// 				}
// 				const wh = hoursDiff(inDT, outDT);
// 				if (s && e) {
// 					dayComplete += wh;
// 					dayAuto += wh;
// 				} else {
// 					dayAuto += wh;
// 				}
// 				worked.push({
// 					date,
// 					from: s ? s.Timestamp : null,
// 					to: e ? e.Timestamp : null,
// 					worked_hours: wh.toFixed(2),
// 					auto_filled: !(s && e),
// 				});
// 			});

// 			if (dayComplete > sched.standardHours) {
// 				extra_hours.push({
// 					date,
// 					extra_hours: +(dayComplete - sched.standardHours).toFixed(2),
// 				});
// 			}
// 			totalWorkedComplete += dayComplete;
// 			totalWorkedAuto += dayAuto;
// 			totalLateHours += lateMin / 60;
// 		}
// 	}

// 	report.push({
// 		name: emp?.name || `Unknown (${badge_id})`,
// 		badge_id,
// 		shift_type: empType, // helpful for verification
// 		worked,
// 		late_checkins,
// 		extra_hours,
// 		forgot,
// 		absent_days,
// 		off_days,
// 		unscheduled_shifts,
// 		totals: {
// 			total_worked_hours: +totalWorkedComplete.toFixed(2),
// 			total_worked_auto: +totalWorkedAuto.toFixed(2),
// 			total_late_hours: +totalLateHours.toFixed(2),
// 		},
// 	});
// }

// fs.writeFileSync(
// 	path.join(__dirname, "attendance_report.json"),
// 	JSON.stringify(report, null, 2),
// 	"utf8"
// );

// console.log(
// 	"Attendance report generated with regular-shift overrides applied."
// );

const fs = require("fs");
const path = require("path");

// ================= CONFIG =================
const NIGHT_SHIFT_BADGE_IDS = [
	"1001",
	"1002",
	"1003",
	"1006",
	"1011",
	"1014",
	"1018",
	"1019",
	"1021",
	"1022",
	"1023",
	"1025",
	"1029",
	"1031",
	"1033",
	"1034",
	"1040",
	"1045",
	"1048",
	"1053",
	"1061",
	"1064",
	"1066",
	"1072",
];

// New: these 1000–1999 employees should now be treated as REGULAR (not day or night shift).
// Fill this with the actual IDs that moved.
const REGULAR_SHIFT_OVERRIDES = [
	// "1015","1025",  // Example placeholders – replace with real list
];

// Gap-based absence configuration for night shifts
const GLOBAL_MAX_PLANNED_OFF_CONSECUTIVE = 2;

// Standard schedule constants
const SHIFT_DAY_START = "07:00:00";
const SHIFT_DAY_END = "19:00:00";
const REGULAR_START = "08:30:00";
const REGULAR_END = "17:30:00";
const SATURDAY_END = "12:30:00";

// ================ HELPERS =================
function getDate(ts) {
	return ts?.split(" ")[0] || null;
}
function parseTime(ts) {
	if (!ts) return null;
	return new Date(ts.replace(" ", "T"));
}
function hoursDiff(a, b) {
	return (b - a) / (1000 * 60 * 60);
}
function minutesDiff(a, b) {
	return (b - a) / (1000 * 60);
}
function getWeekday(dateStr) {
	return new Date(dateStr).getDay();
}
function addDays(dateStr, d) {
	const dt = new Date(dateStr);
	dt.setDate(dt.getDate() + d);
	return dt.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
	return Math.floor((new Date(b) - new Date(a)) / 86400000);
}

// Central classification
function classifyEmployee(badge_id) {
	// Explicit regular override has highest precedence
	if (REGULAR_SHIFT_OVERRIDES.includes(badge_id)) {
		return "regular";
	}
	const n = +badge_id;
	if (n >= 1000 && n <= 1999) {
		if (NIGHT_SHIFT_BADGE_IDS.includes(badge_id)) return "night";
		// Not night and not overridden -> day shift
		return "day_shift";
	}
	return "regular";
}

// Day shift / regular scheduled times (night shift handled separately)
function scheduledTimes(empType, date) {
	if (empType === "day_shift") {
		const start = new Date(`${date}T${SHIFT_DAY_START}`);
		const end = new Date(`${date}T${SHIFT_DAY_END}`);
		return {
			schedType: "day",
			schedStart: start,
			schedEnd: end,
			standardHours: 12,
		};
	} else if (empType === "regular") {
		const wd = getWeekday(date);
		if (wd === 0) return null; // Sunday off
		const start = new Date(`${date}T${REGULAR_START}`);
		const end = new Date(`${date}T${wd === 6 ? SATURDAY_END : REGULAR_END}`);
		return {
			schedType: "regular",
			schedStart: start,
			schedEnd: end,
			standardHours: hoursDiff(start, end),
		};
	}
	return null;
}

// Anchor date calculation for day shift employees (not night, not regular)
function computeDayShiftAnchorDate(punches) {
	if (!punches.length) return null;
	let minDate = null;
	punches.forEach((p) => {
		const d = getDate(p.Timestamp);
		if (!minDate || d < minDate) minDate = d;
	});
	return minDate;
}

// ============== LOAD DATA ==============
const attendancePath = path.join(__dirname, "attendance.json");
const employeePath = path.join(__dirname, "employees.json");

let attendanceRaw = fs.readFileSync(attendancePath, "utf8").trim();
let employeesRaw = fs.readFileSync(employeePath, "utf8").trim();

if (!attendanceRaw.startsWith("[")) attendanceRaw = "[" + attendanceRaw;
if (!attendanceRaw.endsWith("]")) attendanceRaw += "]";
if (!employeesRaw.startsWith("[")) employeesRaw = "[" + employeesRaw;
if (!employeesRaw.endsWith("]")) employeesRaw += "]";

const attendance = JSON.parse(attendanceRaw);
const employees = JSON.parse(employeesRaw);

const badgeIdToEmployee = {};
employees.forEach((e) => {
	if (e.badge_id) badgeIdToEmployee[e.badge_id] = e;
});

const attendanceByUser = {};
attendance.forEach((r) => {
	if (!r.UserID || !r.Timestamp) return;
	(attendanceByUser[r.UserID] ||= []).push(r);
});

// Build global date range (for day & regular employees)
const allDatesSet = new Set();
attendance.forEach((r) => {
	const d = getDate(r.Timestamp);
	if (d) allDatesSet.add(d);
});
const allDates = Array.from(allDatesSet).sort();
function buildDateRange(dates) {
	if (!dates.length) return [];
	const start = dates[0],
		end = dates[dates.length - 1];
	const range = [];
	let cur = new Date(start);
	const endDt = new Date(end);
	while (cur <= endDt) {
		range.push(cur.toISOString().slice(0, 10));
		cur.setDate(cur.getDate() + 1);
	}
	return range;
}
const dateRange = buildDateRange(allDates);

// Precompute anchor dates only for day_shift employees
const dayShiftAnchorByUser = {};
Object.keys(attendanceByUser).forEach((uid) => {
	const empType = classifyEmployee(uid);
	if (empType === "day_shift") {
		dayShiftAnchorByUser[uid] = computeDayShiftAnchorDate(
			attendanceByUser[uid]
		);
	}
});

// ============== REPORT ==============
const report = [];

for (const badge_id in badgeIdToEmployee) {
	const emp = badgeIdToEmployee[badge_id];
	const userId = badge_id;
	const empType = classifyEmployee(badge_id);

	const punches = (attendanceByUser[userId] || [])
		.slice()
		.sort((a, b) => parseTime(a.Timestamp) - parseTime(b.Timestamp));

	const worked = [];
	const forgot = [];
	const late_checkins = [];
	const early_checkouts = []; // <-- NEW
	const extra_hours = [];
	const absent_days = [];
	const off_days = [];
	const unscheduled_shifts = [];

	let totalWorkedComplete = 0;
	let totalWorkedAuto = 0;
	let totalLateHours = 0;
	let totalEarlyHours = 0; // <-- NEW

	// ---------- NIGHT SHIFT ----------
	if (empType === "night") {
		const STANDARD_HOURS = 12;
		function minutesSinceMidnight(dt) {
			return dt.getHours() * 60 + dt.getMinutes();
		}

		const enriched = punches
			.map((p) => ({ ...p, dt: parseTime(p.Timestamp) }))
			.sort((a, b) => a.dt - b.dt);

		const consumed = new Set();
		const shifts = [];

		// Pass 1: evening starts
		for (let i = 0; i < enriched.length; i++) {
			if (consumed.has(i)) continue;
			const p = enriched[i];
			if (minutesSinceMidnight(p.dt) >= 12 * 60) {
				const startDate = p.dt.toISOString().slice(0, 10);
				let checkoutIdx = -1;
				for (let j = i + 1; j < enriched.length; j++) {
					if (consumed.has(j)) continue;
					const q = enriched[j];
					const qDate = q.dt.toISOString().slice(0, 10);
					const dayDiff = daysBetween(startDate, qDate);
					if (dayDiff === 0) continue;
					if (dayDiff === 1 && minutesSinceMidnight(q.dt) < 12 * 60) {
						checkoutIdx = j;
						break;
					}
					if (dayDiff > 1) break;
				}

				let checkOutDT,
					checkOutSrc = "actual",
					checkOutRaw = null;
				if (checkoutIdx >= 0) {
					checkOutDT = enriched[checkoutIdx].dt;
					checkOutRaw = enriched[checkoutIdx].Timestamp;
					consumed.add(checkoutIdx);
				} else {
					checkOutDT = new Date(startDate + "T19:00:00");
					checkOutDT.setDate(checkOutDT.getDate() + 1);
					checkOutDT.setHours(7, 0, 0, 0);
					checkOutSrc = "auto";
					forgot.push({
						type: "forgot_checkout",
						date: startDate,
						time: p.Timestamp,
					});
				}

				shifts.push({
					startDate,
					checkInDT: p.dt,
					checkOutDT,
					checkInSrc: "actual",
					checkOutSrc,
					checkInRaw: p.Timestamp,
					checkOutRaw,
				});
			}
		}

		// Pass 2: morning-only (forgot check-in)
		for (let i = 0; i < enriched.length; i++) {
			if (consumed.has(i)) continue;
			const p = enriched[i];
			if (minutesSinceMidnight(p.dt) < 12 * 60) {
				const morningDate = p.dt.toISOString().slice(0, 10);
				const startDate = addDays(morningDate, -1);
				if (shifts.some((s) => s.startDate === startDate)) continue;
				const checkInDT = new Date(startDate + "T19:00:00");
				shifts.push({
					startDate,
					checkInDT,
					checkOutDT: p.dt,
					checkInSrc: "auto",
					checkOutSrc: "actual",
					checkInRaw: null,
					checkOutRaw: p.Timestamp,
				});
				consumed.add(i);
				forgot.push({
					type: "forgot_checkin",
					date: startDate,
					time: p.Timestamp,
				});
			}
		}

		shifts.sort((a, b) => a.startDate.localeCompare(b.startDate));

		// Totals & worked
		shifts.forEach((s) => {
			const nominalStart = new Date(s.startDate + "T19:00:00");
			nominalStart.setDate(nominalStart.getDate() + 0);
			nominalStart.setHours(19, 0, 0, 0);
			const nominalEnd = new Date(s.startDate + "T19:00:00");
			nominalEnd.setDate(nominalEnd.getDate() + 1);
			nominalEnd.setHours(7, 0, 0, 0);

			if (s.checkInSrc === "actual") {
				if (s.checkInDT > nominalStart) {
					const lm = minutesDiff(nominalStart, s.checkInDT);
					late_checkins.push({
						date: s.startDate,
						time: s.checkInRaw,
						minutes: Math.round(lm),
					});
					totalLateHours += lm / 60;
				}
			}

			if (s.checkOutSrc === "actual" && s.checkOutDT < nominalEnd) {
				const em = minutesDiff(s.checkOutDT, nominalEnd);
				early_checkouts.push({
					date: s.startDate,
					time: s.checkOutRaw,
					minutes: Math.round(em),
				});
				totalEarlyHours += em / 60;
			}

			let wh = hoursDiff(s.checkInDT, s.checkOutDT);
			if (wh < 0 || wh > 20) wh = STANDARD_HOURS;

			const fullyActual =
				s.checkInSrc === "actual" && s.checkOutSrc === "actual";
			if (fullyActual) {
				totalWorkedComplete += wh;
				totalWorkedAuto += wh;
			} else {
				totalWorkedAuto += wh;
			}

			if (wh > STANDARD_HOURS) {
				extra_hours.push({
					date: s.startDate,
					extra_hours: +(wh - STANDARD_HOURS).toFixed(2),
				});
			}

			worked.push({
				date: s.startDate,
				from: s.checkInRaw,
				to: s.checkOutRaw,
				worked_hours: wh.toFixed(2),
				auto_filled: !fullyActual,
				checkin_auto: s.checkInSrc === "auto",
				checkout_auto: s.checkOutSrc === "auto",
			});
		});

		// Gap-based absences
		if (shifts.length > 1) {
			for (let i = 1; i < shifts.length; i++) {
				const prev = shifts[i - 1].startDate;
				const cur = shifts[i].startDate;
				const gapDays = daysBetween(prev, cur);
				const missingNights = gapDays - 1;
				if (missingNights > GLOBAL_MAX_PLANNED_OFF_CONSECUTIVE) {
					for (
						let k = GLOBAL_MAX_PLANNED_OFF_CONSECUTIVE + 1;
						k <= missingNights;
						k++
					) {
						absent_days.push(addDays(prev, k));
					}
				}
			}
		}

		// ---------- DAY SHIFT ----------
	} else if (empType === "day_shift") {
		const anchorDate = dayShiftAnchorByUser[userId] || null;
		if (anchorDate) {
			for (const date of dateRange) {
				if (daysBetween(anchorDate, date) % 2 !== 0) continue; // every other day
				const sched = scheduledTimes(empType, date);
				if (!sched) continue;

				const windowStart = new Date(`${date}T04:00:00`);
				const windowEnd = new Date(`${date}T22:00:00`);

				const dayPunches = punches
					.map((p) => ({ ...p, dt: parseTime(p.Timestamp) }))
					.filter((p) => p.dt >= windowStart && p.dt <= windowEnd)
					.sort((a, b) => a.dt - b.dt);

				if (dayPunches.length === 0) {
					absent_days.push(date);
					continue;
				}

				const sessions = [];
				let j = 0;
				while (j < dayPunches.length) {
					const s = dayPunches[j],
						e = dayPunches[j + 1];
					if (!e) {
						const distStart = Math.abs(s.dt - sched.schedStart);
						const distEnd = Math.abs(s.dt - sched.schedEnd);
						const schedDur = sched.schedEnd - sched.schedStart;
						if (distEnd < distStart && distEnd < schedDur * 0.25) {
							sessions.push([null, s]);
							forgot.push({ type: "forgot_checkin", date, time: s.Timestamp });
						} else {
							sessions.push([s, null]);
							forgot.push({ type: "forgot_checkout", date, time: s.Timestamp });
						}
						j += 1;
					} else {
						sessions.push([s, e]);
						j += 2;
					}
				}

				let dayComplete = 0,
					dayAuto = 0,
					lateMin = 0;
				sessions.forEach(([s, e], idx) => {
					const inDT = s ? s.dt : sched.schedStart;
					const outDT = e ? e.dt : sched.schedEnd;
					if (idx === 0 && s && inDT > sched.schedStart) {
						const lm = minutesDiff(sched.schedStart, inDT);
						lateMin += lm;
						late_checkins.push({
							date,
							time: s.Timestamp,
							minutes: Math.round(lm),
						});
					}
					if (e && outDT < sched.schedEnd) {
						const em = minutesDiff(outDT, sched.schedEnd);
						early_checkouts.push({
							date,
							time: e.Timestamp,
							minutes: Math.round(em),
						});
						totalEarlyHours += em / 60;
					}
					const wh = hoursDiff(inDT, outDT);
					if (s && e) {
						dayComplete += wh;
						dayAuto += wh;
					} else {
						dayAuto += wh;
					}
					worked.push({
						date,
						from: s ? s.Timestamp : null,
						to: e ? e.Timestamp : null,
						worked_hours: wh.toFixed(2),
						auto_filled: !(s && e),
					});
				});

				if (dayComplete > sched.standardHours) {
					extra_hours.push({
						date,
						extra_hours: +(dayComplete - sched.standardHours).toFixed(2),
					});
				}
				totalWorkedComplete += dayComplete;
				totalWorkedAuto += dayAuto;
				totalLateHours += lateMin / 60;
			}
		}

		// ---------- REGULAR (includes override 1000–1999 moved to regular) ----------
	} else {
		for (const date of dateRange) {
			const sched = scheduledTimes(empType, date);
			if (!sched) continue;

			const dayPunches = punches
				.filter((p) => getDate(p.Timestamp) === date)
				.sort((a, b) => parseTime(a.Timestamp) - parseTime(b.Timestamp));

			if (dayPunches.length === 0) {
				absent_days.push(date);
				continue;
			}

			const sessions = [];
			let j = 0;
			while (j < dayPunches.length) {
				const s = dayPunches[j],
					e = dayPunches[j + 1];
				if (!e) {
					const dt = parseTime(s.Timestamp);
					const distStart = Math.abs(dt - sched.schedStart);
					const distEnd = Math.abs(dt - sched.schedEnd);
					const schedDur = sched.schedEnd - sched.schedStart;
					if (distEnd < distStart && distEnd < schedDur * 0.25) {
						sessions.push([null, s]);
						forgot.push({ type: "forgot_checkin", date, time: s.Timestamp });
					} else {
						sessions.push([s, null]);
						forgot.push({ type: "forgot_checkout", date, time: s.Timestamp });
					}
					j += 1;
				} else {
					sessions.push([s, e]);
					j += 2;
				}
			}

			let dayComplete = 0,
				dayAuto = 0,
				lateMin = 0;
			sessions.forEach(([s, e], idx) => {
				const inDT = s ? parseTime(s.Timestamp) : sched.schedStart;
				const outDT = e ? parseTime(e.Timestamp) : sched.schedEnd;
				if (idx === 0 && s && inDT > sched.schedStart) {
					const lm = minutesDiff(sched.schedStart, inDT);
					lateMin += lm;
					late_checkins.push({
						date,
						time: s.Timestamp,
						minutes: Math.round(lm),
					});
				}
				if (e && outDT < sched.schedEnd) {
					const em = minutesDiff(outDT, sched.schedEnd);
					early_checkouts.push({
						date,
						time: e.Timestamp,
						minutes: Math.round(em),
					});
					totalEarlyHours += em / 60;
				}
				const wh = hoursDiff(inDT, outDT);
				if (s && e) {
					dayComplete += wh;
					dayAuto += wh;
				} else {
					dayAuto += wh;
				}
				worked.push({
					date,
					from: s ? s.Timestamp : null,
					to: e ? e.Timestamp : null,
					worked_hours: wh.toFixed(2),
					auto_filled: !(s && e),
				});
			});

			if (dayComplete > sched.standardHours) {
				extra_hours.push({
					date,
					extra_hours: +(dayComplete - sched.standardHours).toFixed(2),
				});
			}
			totalWorkedComplete += dayComplete;
			totalWorkedAuto += dayAuto;
			totalLateHours += lateMin / 60;
		}
	}

	report.push({
		name: emp?.name || `Unknown (${badge_id})`,
		badge_id,
		shift_type: empType, // helpful for verification
		worked,
		late_checkins,
		early_checkouts, // <-- NEW
		extra_hours,
		forgot,
		absent_days,
		off_days,
		unscheduled_shifts,
		totals: {
			total_worked_hours: +totalWorkedComplete.toFixed(2),
			total_worked_auto: +totalWorkedAuto.toFixed(2),
			total_late_hours: +totalLateHours.toFixed(2),
			total_early_hours: +totalEarlyHours.toFixed(2), // <-- NEW
		},
	});
}

fs.writeFileSync(
	path.join(__dirname, "attendance_report.json"),
	JSON.stringify(report, null, 2),
	"utf8"
);

console.log(
	"Attendance report generated with regular-shift overrides applied."
);
