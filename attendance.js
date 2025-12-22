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
// 	"1041",
// 	"1045",
// 	"1048",
// 	"1053",
// 	"1057",
// 	"1061",
// 	"1064",
// 	"1066",
// 	"1072",
// 	"1074",
// 	"1085",
// 	"1086",
// 	"1087",
// 	"1091",
// 	"1094",
// 	"1095",
// 	"1096",
// ];

// // New: these 1000–1999 employees should now be treated as REGULAR (not day or night shift).
// const REGULAR_SHIFT_OVERRIDES = [
// 	"1010",
// 	"1013",
// 	"1012",
// 	"1090",
// 	"1081",
// 	"1080",
// 	"1079",
// 	"1078",
// 	"1077",
// 	"1075",
// 	"1073",
// 	"1054",
// 	"1024",
// 	"1071",
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
// 	if (REGULAR_SHIFT_OVERRIDES.includes(badge_id)) {
// 		return "regular";
// 	}
// 	const n = +badge_id;
// 	if (n >= 1000 && n <= 1999) {
// 		if (NIGHT_SHIFT_BADGE_IDS.includes(badge_id)) return "night";
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
// const holidaysPath = path.join(__dirname, "holidays.json");

// let attendanceRaw = fs.readFileSync(attendancePath, "utf8").trim();
// let employeesRaw = fs.readFileSync(employeePath, "utf8").trim();
// let holidaysRaw = fs.existsSync(holidaysPath)
// 	? fs.readFileSync(holidaysPath, "utf8").trim()
// 	: "[]";

// if (!attendanceRaw.startsWith("[")) attendanceRaw = "[" + attendanceRaw;
// if (!attendanceRaw.endsWith("]")) attendanceRaw += "]";
// if (!employeesRaw.startsWith("[")) employeesRaw = "[" + employeesRaw;
// if (!employeesRaw.endsWith("]")) employeesRaw += "]";
// if (!holidaysRaw.startsWith("[")) holidaysRaw = "[" + holidaysRaw;
// if (!holidaysRaw.endsWith("]")) holidaysRaw += "]";

// const attendance = JSON.parse(attendanceRaw);
// const employees = JSON.parse(employeesRaw);
// const holidaysList = JSON.parse(holidaysRaw);
// const holidays = new Set(holidaysList);

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

// // =========== Utility for only final checkout =============
// function findFinalCheckoutIdx(sessions) {
// 	for (let k = sessions.length - 1; k >= 0; k--) {
// 		if (sessions[k][1]) {
// 			// if checkout exists
// 			return k;
// 		}
// 	}
// 	return -1;
// }

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
// 	const early_checkouts = [];
// 	const extra_hours = [];
// 	let absent_days = [];
// 	const off_days = [];
// 	const unscheduled_shifts = [];

// 	let totalWorkedComplete = 0;
// 	let totalWorkedAuto = 0;
// 	let totalLateHours = 0;
// 	let totalEarlyHours = 0;

// 	// ========== Calculate expected workdays & hours (excluding holidays) ==========
// 	let expectedWorkDays = 0;
// 	let expectedWorkHours = 0;

// 	if (empType === "night") {
// 		for (let i = 0; i < dateRange.length; i++) {
// 			const date = dateRange[i];
// 			if (holidays.has(date)) continue;
// 			expectedWorkDays += 1;
// 			expectedWorkHours += 12;
// 		}
// 	} else if (empType === "day_shift") {
// 		const anchorDate = dayShiftAnchorByUser[userId] || null;
// 		if (anchorDate) {
// 			for (let i = 0; i < dateRange.length; i++) {
// 				const date = dateRange[i];
// 				if (holidays.has(date)) continue;
// 				if (daysBetween(anchorDate, date) % 2 !== 0) continue;
// 				expectedWorkDays += 1;
// 				expectedWorkHours += 12;
// 			}
// 		}
// 	} else if (empType === "regular") {
// 		for (let i = 0; i < dateRange.length; i++) {
// 			const date = dateRange[i];
// 			if (holidays.has(date)) continue;
// 			const wd = getWeekday(date);
// 			if (wd === 0) continue; // Sunday off
// 			expectedWorkDays += 1;
// 			expectedWorkHours +=
// 				wd === 6
// 					? hoursDiff(
// 							new Date(`${date}T${REGULAR_START}`),
// 							new Date(`${date}T${SATURDAY_END}`)
// 					  )
// 					: hoursDiff(
// 							new Date(`${date}T${REGULAR_START}`),
// 							new Date(`${date}T${REGULAR_END}`)
// 					  );
// 		}
// 	}

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
// 			const nominalStart = new Date(s.startDate + "T19:00:00");
// 			nominalStart.setDate(nominalStart.getDate() + 0);
// 			nominalStart.setHours(19, 0, 0, 0);
// 			const nominalEnd = new Date(s.startDate + "T19:00:00");
// 			nominalEnd.setDate(nominalEnd.getDate() + 1);
// 			nominalEnd.setHours(7, 0, 0, 0);

// 			if (s.checkInSrc === "actual") {
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

// 			if (s.checkOutSrc === "actual" && s.checkOutDT < nominalEnd) {
// 				const em = minutesDiff(s.checkOutDT, nominalEnd);
// 				early_checkouts.push({
// 					date: s.startDate,
// 					time: s.checkOutRaw,
// 					minutes: Math.round(em),
// 				});
// 				totalEarlyHours += em / 60;
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
// 						const candidate = addDays(prev, k);
// 						if (!holidays.has(candidate)) {
// 							absent_days.push(candidate);
// 						}
// 					}
// 				}
// 			}
// 		}

// 		// ---------- DAY SHIFT ----------
// 	} else if (empType === "day_shift") {
// 		const anchorDate = dayShiftAnchorByUser[userId] || null;
// 		if (anchorDate) {
// 			for (const date of dateRange) {
// 				if (holidays.has(date)) continue;
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

// 				// Only check final checkout for early checkout
// 				const finalSessionIdx = findFinalCheckoutIdx(sessions);

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
// 					// Only consider the FINAL checkout for early checkout
// 					if (e && idx === finalSessionIdx && outDT < sched.schedEnd) {
// 						const em = minutesDiff(outDT, sched.schedEnd);
// 						early_checkouts.push({
// 							date,
// 							time: e.Timestamp,
// 							minutes: Math.round(em),
// 						});
// 						totalEarlyHours += em / 60;
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
// 			if (holidays.has(date)) continue;
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

// 			// Only check final checkout for early checkout
// 			const finalSessionIdx = findFinalCheckoutIdx(sessions);

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
// 				// Only consider the FINAL checkout for early checkout
// 				if (e && idx === finalSessionIdx && outDT < sched.schedEnd) {
// 					const em = minutesDiff(outDT, sched.schedEnd);
// 					early_checkouts.push({
// 						date,
// 						time: e.Timestamp,
// 						minutes: Math.round(em),
// 					});
// 					totalEarlyHours += em / 60;
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

// 	// ========== Filter absent_days: skip holidays ==========
// 	absent_days = absent_days.filter((d) => !holidays.has(d));

// 	report.push({
// 		name: emp?.name || `Unknown (${badge_id})`,
// 		badge_id,
// 		shift_type: empType,
// 		worked,
// 		late_checkins,
// 		early_checkouts,
// 		extra_hours,
// 		forgot,
// 		absent_days,
// 		off_days,
// 		unscheduled_shifts,
// 		totals: {
// 			total_worked_hours: +totalWorkedComplete.toFixed(2),
// 			total_worked_auto: +totalWorkedAuto.toFixed(2),
// 			total_late_hours: +totalLateHours.toFixed(2),
// 			total_early_hours: +totalEarlyHours.toFixed(2),
// 			expected_work_days: expectedWorkDays,
// 			expected_work_hours: +expectedWorkHours.toFixed(2),
// 		},
// 	});
// }

// fs.writeFileSync(
// 	path.join(__dirname, "attendance_report.json"),
// 	JSON.stringify(report, null, 2),
// 	"utf8"
// );

// console.log(
// 	"Attendance report generated with holiday skipping and expected work hours calculation."
// );

// (Updated attendance.js - full file)
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
	"1041",
	"1045",
	"1048",
	"1053",
	"1057",
	"1061",
	"1064",
	"1066",
	"1072",
	"1074",
	"1085",
	"1086",
	"1087",
	"1091",
	"1094",
	"1095",
	"1096",
];

// New: these 1000–1999 employees should now be treated as REGULAR (not day or night shift).
const REGULAR_SHIFT_OVERRIDES = [
	"1010",
	"1013",
	"1012",
	"1090",
	"1081",
	"1080",
	"1079",
	"1078",
	"1077",
	"1075",
	"1073",
	"1054",
	"1024",
	"1071",
];

// Gap-based absence configuration for night shifts
const GLOBAL_MAX_PLANNED_OFF_CONSECUTIVE = 2;

// Standard schedule constants
const SHIFT_DAY_START = "07:00:00";
const SHIFT_DAY_END = "19:00:00";
const REGULAR_START = "08:30:00";
const REGULAR_END = "17:30:00";
const SATURDAY_END = "12:30:00";

// ===== TOLERANCE CONFIG =====
// Global tolerance (minutes) applied to ALL employees for lateness / early checkout
const GLOBAL_TOLERANCE_MIN = 30;

// Custom tolerance (minutes) for specific employees (array of badge_id strings).
// Put badge IDs here if they should have the custom tolerance instead of the global one.
const CUSTOM_TOLERANCE_IDS = [
	"1010", "3001", ""
];
const CUSTOM_TOLERANCE_MIN = 60;

// ===== LUNCH/EXPECTED HOURS CONFIG =====
// Default lunch break to subtract from scheduled hours (in minutes) for shifts that include lunch.
const DEFAULT_LUNCH_MIN = 60;
// Night shift typically has no lunch deduction in our logic:
const NIGHT_LUNCH_MIN = 0;
// =============================

// ===== HARDCODED EXPECTED HOURS CONFIG =====
// Put the total expected work hours for the entire reporting timeframe per badge here.
// Use string keys (recommended) or numeric keys — lookups are coerced to string internally.
const MANUAL_EXPECTED_TOTAL_HOURS = {
	// Example entries:
	// "1072": 88.5,
	// "1001": 72,
	1010: 188,
};

// ===== HARDCODED EXPECTED HOURS BY SHIFT (fallbacks if you still want automatic behavior) =====
const EXPECTED_WORK_HOURS_BY_SHIFT = {
	night: 12, // default expected hours for a night-working day
	day_shift: 12, // default expected hours for day_shift
	regular_weekday: 8, // default regular weekday expected hours
	regular_saturday: 4, // expected hours for Saturday
};
// Per-badge per-day expected hours if you want to override per badge (keyed by badge id string)
const EXPECTED_HOURS_BY_BADGE = {
	1010: 188,
};
// =============================

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

function getToleranceMinutes(badge_id) {
	if (CUSTOM_TOLERANCE_IDS.includes(String(badge_id)))
		return CUSTOM_TOLERANCE_MIN;
	return GLOBAL_TOLERANCE_MIN;
}

function getLunchDeductionMinutes(empType) {
	if (empType === "night") return NIGHT_LUNCH_MIN;
	// For regular & day_shift assume 1 hour lunch by default
	return DEFAULT_LUNCH_MIN;
}

// Central classification
function classifyEmployee(badge_id) {
	if (REGULAR_SHIFT_OVERRIDES.includes(String(badge_id))) {
		return "regular";
	}
	const n = +badge_id;
	if (n >= 1000 && n <= 1999) {
		if (NIGHT_SHIFT_BADGE_IDS.includes(String(badge_id))) return "night";
		return "day_shift";
	}
	return "regular";
}

// Day shift / regular scheduled times (night shift handled separately)
function scheduledTimes(empType, date) {
	if (empType === "day_shift") {
		const start = new Date(`${date}T${SHIFT_DAY_START}`);
		const end = new Date(`${date}T${SHIFT_DAY_END}`);
		const rawHours = hoursDiff(start, end);
		const lunchMin = getLunchDeductionMinutes(empType);
		const expectedHours = Math.max(0, rawHours - lunchMin / 60);
		return {
			schedType: "day",
			schedStart: start,
			schedEnd: end,
			standardHours: rawHours,
			expectedHours,
		};
	} else if (empType === "regular") {
		const wd = getWeekday(date);
		if (wd === 0) return null; // Sunday off
		const start = new Date(`${date}T${REGULAR_START}`);
		const end = new Date(`${date}T${wd === 6 ? SATURDAY_END : REGULAR_END}`);
		const rawHours = hoursDiff(start, end);
		const lunchMin = getLunchDeductionMinutes(empType);
		const expectedHours = Math.max(0, rawHours - lunchMin / 60);
		return {
			schedType: "regular",
			schedStart: start,
			schedEnd: end,
			standardHours: rawHours,
			expectedHours,
		};
	}
	return null;
}

// Helper: returns expected hours for a particular badge / type / date (in hours)
// Important: badge_id is coerced to string when looking up MANUAL_EXPECTED_TOTAL_HOURS or EXPECTED_HOURS_BY_BADGE.
function expectedHoursFor(badge_id, empType, date) {
	const bid = String(badge_id);
	// If MANUAL_EXPECTED_TOTAL_HOURS provides a manual total, we return null here because the manual total
	// is applied at the totals level (not per-day).
	if (Object.prototype.hasOwnProperty.call(MANUAL_EXPECTED_TOTAL_HOURS, bid)) {
		return null;
	}
	if (Object.prototype.hasOwnProperty.call(EXPECTED_HOURS_BY_BADGE, bid)) {
		return EXPECTED_HOURS_BY_BADGE[bid];
	}
	if (empType === "night") return EXPECTED_WORK_HOURS_BY_SHIFT.night;
	if (empType === "day_shift") return EXPECTED_WORK_HOURS_BY_SHIFT.day_shift;
	const wd = getWeekday(date);
	if (wd === 6) return EXPECTED_WORK_HOURS_BY_SHIFT.regular_saturday;
	return EXPECTED_WORK_HOURS_BY_SHIFT.regular_weekday;
}

// Anchor date calculation for alternating schedules (day_shift and night)
function computeAnchorDate(punches) {
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
const holidaysPath = path.join(__dirname, "holidays.json");

let attendanceRaw = fs.readFileSync(attendancePath, "utf8").trim();
let employeesRaw = fs.readFileSync(employeePath, "utf8").trim();
let holidaysRaw = fs.existsSync(holidaysPath)
	? fs.readFileSync(holidaysPath, "utf8").trim()
	: "[]";

if (!attendanceRaw.startsWith("[")) attendanceRaw = "[" + attendanceRaw;
if (!attendanceRaw.endsWith("]")) attendanceRaw += "]";
if (!employeesRaw.startsWith("[")) employeesRaw = "[" + employeesRaw;
if (!employeesRaw.endsWith("]")) employeesRaw += "]";
if (!holidaysRaw.startsWith("[")) holidaysRaw = "[" + holidaysRaw;
if (!holidaysRaw.endsWith("]")) holidaysRaw += "]";

const attendance = JSON.parse(attendanceRaw);
const employees = JSON.parse(employeesRaw);
const holidaysList = JSON.parse(holidaysRaw);
const holidays = new Set(holidaysList);

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

// Precompute anchor dates for alternating schedules (day_shift and night)
const anchorByUser = {};
Object.keys(attendanceByUser).forEach((uid) => {
	const empType = classifyEmployee(uid);
	if (empType === "day_shift" || empType === "night") {
		anchorByUser[uid] = computeAnchorDate(attendanceByUser[uid]);
	}
});

// ============== REPORT ==============
const report = [];

// =========== Utility for only final checkout =============
function findFinalCheckoutIdx(sessions) {
	for (let k = sessions.length - 1; k >= 0; k--) {
		if (sessions[k][1]) {
			// if checkout exists
			return k;
		}
	}
	return -1;
}

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
	const early_checkouts = [];
	const extra_hours = [];
	let absent_days = [];
	const off_days = [];
	const unscheduled_shifts = [];
	const lunch_breaks = []; // NEW: collect lunch breaks per employee (only for day_shift & regular)

	let totalWorkedComplete = 0;
	let totalWorkedAuto = 0;
	let totalLateHours = 0;
	let totalEarlyHours = 0;

	// ========== Calculate expected workdays & hours (excluding holidays) ==========
	let expectedWorkDays = 0;
	let expectedWorkHours = 0;

	if (empType === "night") {
		// Night employees: use anchor for alternating nights, but expected hours per working night come from hard-coded mapping
		const anchorDate = anchorByUser[userId] || null;
		if (anchorDate) {
			for (let i = 0; i < dateRange.length; i++) {
				const date = dateRange[i];
				if (holidays.has(date)) continue;
				if (daysBetween(anchorDate, date) % 2 !== 0) continue; // alternating nights
				expectedWorkDays += 1;
				const perDay = expectedHoursFor(badge_id, empType, date);
				if (perDay !== null) expectedWorkHours += perDay;
			}
		}
	} else if (empType === "day_shift") {
		const anchorDate = anchorByUser[userId] || null;
		if (anchorDate) {
			for (let i = 0; i < dateRange.length; i++) {
				const date = dateRange[i];
				if (holidays.has(date)) continue;
				if (daysBetween(anchorDate, date) % 2 !== 0) continue;
				expectedWorkDays += 1;
				const perDay = expectedHoursFor(badge_id, empType, date);
				if (perDay !== null) expectedWorkHours += perDay;
			}
		}
	} else if (empType === "regular") {
		for (let i = 0; i < dateRange.length; i++) {
			const date = dateRange[i];
			if (holidays.has(date)) continue;
			const wd = getWeekday(date);
			if (wd === 0) continue; // Sunday off
			expectedWorkDays += 1;
			const perDay = expectedHoursFor(badge_id, empType, date);
			if (perDay !== null) expectedWorkHours += perDay;
		}
	}

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
			nominalStart.setHours(19, 0, 0, 0);
			const nominalEnd = new Date(s.startDate + "T19:00:00");
			nominalEnd.setDate(nominalEnd.getDate() + 1);
			nominalEnd.setHours(7, 0, 0, 0);

			const tolerance = getToleranceMinutes(badge_id);

			if (s.checkInSrc === "actual") {
				if (s.checkInDT > nominalStart) {
					const lmRaw = minutesDiff(nominalStart, s.checkInDT);
					const lm = lmRaw - tolerance;
					if (lm > 0) {
						late_checkins.push({
							date: s.startDate,
							time: s.checkInRaw,
							minutes: Math.round(lm),
						});
						totalLateHours += lm / 60;
					}
				}
			}

			if (s.checkOutSrc === "actual" && s.checkOutDT < nominalEnd) {
				const emRaw = minutesDiff(s.checkOutDT, nominalEnd);
				const em = emRaw - tolerance;
				if (em > 0) {
					early_checkouts.push({
						date: s.startDate,
						time: s.checkOutRaw,
						minutes: Math.round(em),
					});
					totalEarlyHours += em / 60;
				}
			}

			let wh = hoursDiff(s.checkInDT, s.checkOutDT);

			// For night shift we DO NOT deduct lunch from actual worked hours here (we don't record lunch for nights).
			if (wh < 0 || wh > 20) wh = 12;

			const fullyActual =
				s.checkInSrc === "actual" && s.checkOutSrc === "actual";
			if (fullyActual) {
				totalWorkedComplete += wh;
				totalWorkedAuto += wh;
			} else {
				totalWorkedAuto += wh;
			}

			// extra hours for night: compare with expectedHoursFor (fallback)
			const expectedForNight =
				expectedHoursFor(badge_id, empType, s.startDate) ||
				EXPECTED_WORK_HOURS_BY_SHIFT.night;
			if (wh > expectedForNight) {
				extra_hours.push({
					date: s.startDate,
					extra_hours: +(wh - expectedForNight).toFixed(2),
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
						const candidate = addDays(prev, k);
						if (!holidays.has(candidate)) {
							absent_days.push(candidate);
						}
					}
				}
			}
		}

		// ---------- DAY SHIFT ----------
	} else if (empType === "day_shift") {
		const anchorDate = anchorByUser[userId] || null;
		if (anchorDate) {
			for (const date of dateRange) {
				if (holidays.has(date)) continue;
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

				// NEW: detect lunch breaks from multiple sessions (only for day_shift)
				if (sessions.length > 1) {
					for (let k = 0; k < sessions.length - 1; k++) {
						const cur = sessions[k];
						const next = sessions[k + 1];
						const curOutObj = cur[1]; // checkout object or null
						const nextInObj = next[0]; // checkin object or null

						const curOutDT = curOutObj ? parseTime(curOutObj.Timestamp) : null;
						const nextInDT = nextInObj ? parseTime(nextInObj.Timestamp) : null;

						// Only consider this a lunch break if there's at least one side recorded
						if (!curOutDT && !nextInDT) continue;

						// If both exist, only keep if gap > 0 minutes
						if (curOutDT && nextInDT) {
							const gapMin = minutesDiff(curOutDT, nextInDT);
							if (gapMin <= 0) continue;
							lunch_breaks.push({
								date,
								from: curOutObj.Timestamp,
								to: nextInObj.Timestamp,
								minutes: Math.round(gapMin),
							});
						} else {
							// one side only (forgot check in/out for lunch)
							lunch_breaks.push({
								date,
								from: curOutObj ? curOutObj.Timestamp : null,
								to: nextInObj ? nextInObj.Timestamp : null,
								minutes: null,
							});
						}
					}
				}

				// Only check final checkout for early checkout
				const finalSessionIdx = findFinalCheckoutIdx(sessions);

				let dayComplete = 0,
					dayAuto = 0,
					lateMin = 0;
				const tolerance = getToleranceMinutes(badge_id);
				sessions.forEach(([s, e], idx) => {
					const inDT = s ? s.dt : sched.schedStart;
					const outDT = e ? e.dt : sched.schedEnd;
					if (idx === 0 && s && inDT > sched.schedStart) {
						const lmRaw = minutesDiff(sched.schedStart, inDT);
						const lm = lmRaw - tolerance;
						if (lm > 0) {
							lateMin += lm;
							late_checkins.push({
								date,
								time: s.Timestamp,
								minutes: Math.round(lm),
							});
						}
					}
					// Only consider the FINAL checkout for early checkout
					if (e && idx === finalSessionIdx && outDT < sched.schedEnd) {
						const emRaw = minutesDiff(outDT, sched.schedEnd);
						const em = emRaw - tolerance;
						if (em > 0) {
							early_checkouts.push({
								date,
								time: e.Timestamp,
								minutes: Math.round(em),
							});
							totalEarlyHours += em / 60;
						}
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

				// Use hard-coded expected hours when deciding extra hours (fallback to expectedHoursFor)
				const expectedForDay =
					expectedHoursFor(badge_id, empType, date) ||
					EXPECTED_WORK_HOURS_BY_SHIFT.day_shift;
				if (dayComplete > expectedForDay) {
					extra_hours.push({
						date,
						extra_hours: +(dayComplete - expectedForDay).toFixed(2),
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
			if (holidays.has(date)) continue;
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

			// NEW: detect lunch breaks from multiple sessions (only for regular)
			if (sessions.length > 1) {
				for (let k = 0; k < sessions.length - 1; k++) {
					const cur = sessions[k];
					const next = sessions[k + 1];
					const curOutObj = cur[1]; // checkout object or null
					const nextInObj = next[0]; // checkin object or null

					const curOutDT = curOutObj ? parseTime(curOutObj.Timestamp) : null;
					const nextInDT = nextInObj ? parseTime(nextInObj.Timestamp) : null;

					// Only consider this a lunch break if there's at least one side recorded
					if (!curOutDT && !nextInDT) continue;

					// If both exist, only keep if gap > 0 minutes
					if (curOutDT && nextInDT) {
						const gapMin = minutesDiff(curOutDT, nextInDT);
						if (gapMin <= 0) continue;
						lunch_breaks.push({
							date,
							from: curOutObj.Timestamp,
							to: nextInObj.Timestamp,
							minutes: Math.round(gapMin),
						});
					} else {
						// one side only (forgot check in/out for lunch)
						lunch_breaks.push({
							date,
							from: curOutObj ? curOutObj.Timestamp : null,
							to: nextInObj ? nextInObj.Timestamp : null,
							minutes: null,
						});
					}
				}
			}

			// Only check final checkout for early checkout
			const finalSessionIdx = findFinalCheckoutIdx(sessions);

			let dayComplete = 0,
				dayAuto = 0,
				lateMin = 0;
			const tolerance = getToleranceMinutes(badge_id);
			sessions.forEach(([s, e], idx) => {
				const inDT = s ? parseTime(s.Timestamp) : sched.schedStart;
				const outDT = e ? parseTime(e.Timestamp) : sched.schedEnd;
				if (idx === 0 && s && inDT > sched.schedStart) {
					const lmRaw = minutesDiff(sched.schedStart, inDT);
					const lm = lmRaw - tolerance;
					if (lm > 0) {
						lateMin += lm;
						late_checkins.push({
							date,
							time: s.Timestamp,
							minutes: Math.round(lm),
						});
					}
				}
				// Only consider the FINAL checkout for early checkout
				if (e && idx === finalSessionIdx && outDT < sched.schedEnd) {
					const emRaw = minutesDiff(outDT, sched.schedEnd);
					const em = emRaw - tolerance;
					if (em > 0) {
						early_checkouts.push({
							date,
							time: e.Timestamp,
							minutes: Math.round(em),
						});
						totalEarlyHours += em / 60;
					}
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

			// Use hard-coded expected hours when deciding extra hours
			const expectedForReg =
				expectedHoursFor(badge_id, empType, date) ||
				(getWeekday(date) === 6
					? EXPECTED_WORK_HOURS_BY_SHIFT.regular_saturday
					: EXPECTED_WORK_HOURS_BY_SHIFT.regular_weekday);
			if (dayComplete > expectedForReg) {
				extra_hours.push({
					date,
					extra_hours: +(dayComplete - expectedForReg).toFixed(2),
				});
			}
			totalWorkedComplete += dayComplete;
			totalWorkedAuto += dayAuto;
			totalLateHours += lateMin / 60;
		}
	}

	// ========== Filter absent_days: skip holidays ==========
	absent_days = absent_days.filter((d) => !holidays.has(d));

	// If user provided a manual total expected hours for this badge, use it; otherwise fall back to computed expectedWorkHours.
	const manualExpected = Object.prototype.hasOwnProperty.call(
		MANUAL_EXPECTED_TOTAL_HOURS,
		String(badge_id)
	)
		? MANUAL_EXPECTED_TOTAL_HOURS[String(badge_id)]
		: null;

	report.push({
		name: emp?.name || `Unknown (${badge_id})`,
		badge_id,
		department: emp?.department || null,
		shift_type: empType,
		worked,
		// ensure night shift has no lunch breaks
		lunch_break: empType === "night" ? [] : lunch_breaks,
		late_checkins,
		early_checkouts,
		extra_hours,
		forgot,
		absent_days,
		off_days,
		unscheduled_shifts,
		totals: {
			total_worked_hours: +totalWorkedComplete.toFixed(2),
			total_worked_auto: +totalWorkedAuto.toFixed(2),
			total_late_hours: +totalLateHours.toFixed(2),
			total_early_hours: +totalEarlyHours.toFixed(2),
			expected_work_days: expectedWorkDays,
			// use manual expected if provided, otherwise the computed fallback
			expected_work_hours:
				manualExpected !== null
					? manualExpected
					: +expectedWorkHours.toFixed(2),
		},
	});
}

fs.writeFileSync(
	path.join(__dirname, "attendance_report.json"),
	JSON.stringify(report, null, 2),
	"utf8"
);

console.log(
	"Attendance report generated — manual expected total hours support added (see MANUAL_EXPECTED_TOTAL_HOURS mapping)."
);
