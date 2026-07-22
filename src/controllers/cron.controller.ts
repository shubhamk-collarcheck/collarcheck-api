import { Request, Response, NextFunction } from "express";
import { assertOpsAllowed } from "../services/test-routes.service";
import * as cron from "../services/cron.service";

type CronHandler = () => Promise<any>;
type CronIdHandler = (id: number) => Promise<any>;

function sendResult(res: Response, result: any) {
	if (result?.raw != null && result?.id != null && Object.keys(result).length <= 4) {
		return res.status(200).json(result);
	}
	return res.status(200).json(result ?? { status: true });
}

async function run(req: Request, res: Response, next: NextFunction, fn: CronHandler) {
	try {
		assertOpsAllowed(req);
		const result = await fn();
		return sendResult(res, result);
	} catch (error: any) {
		if (error?.status === 403) {
			return res.status(403).json({ status: false, message: error.message || "Forbidden" });
		}
		if (error?.status === 500 && error?.rawBody) {
			return res.status(500).send(error.rawBody);
		}
		next(error);
	}
}

async function runWithId(req: Request, res: Response, next: NextFunction, fn: CronIdHandler) {
	try {
		assertOpsAllowed(req);
		const id = Number(req.params.id);
		if (!id || Number.isNaN(id)) {
			return res.status(200).json({ status: false, message: "Invalid id" });
		}
		const result = await fn(id);
		return sendResult(res, result);
	} catch (error: any) {
		if (error?.status === 403) {
			return res.status(403).json({ status: false, message: error.message || "Forbidden" });
		}
		next(error);
	}
}

// A. Ops
export const backup = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.backupService);

export const updateViewRequest = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.updateViewRequestService);

export const latLongUpdate = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.latLongUpdateService);

export const deleteOtp = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.deleteOtpService);

export const updatePercentage = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.updatePercentageService);

export const percentageStatusReset = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.percentageStatusResetService);

export const updateAccountSetting = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.updateAccountSettingService);

// B. Pipeline
export const createEmailSchedule = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, () => cron.createEmailScheduleService());

export const createEmailScheduleById = (req: Request, res: Response, next: NextFunction) =>
	runWithId(req, res, next, (id) => cron.createEmailScheduleService(id));

export const sendEmailSchedule = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, () => cron.sendEmailScheduleService());

export const sendEmailScheduleById = (req: Request, res: Response, next: NextFunction) =>
	runWithId(req, res, next, (id) => cron.sendEmailScheduleService(id));

export const finalScheduleUpdate = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.finalScheduleUpdateService);

export const createReschedule = (req: Request, res: Response, next: NextFunction) =>
	runWithId(req, res, next, (id) => cron.createRescheduleService(id));

// C. Producers
export const cronNotice = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.cronNoticeService);

export const totalNewJobPost = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.totalNewJobPostService);

export const jobViewedNotApplied = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.jobViewedNotAppliedService);

export const hasNotAppliedAnyJob = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.hasNotAppliedAnyJobService);

export const newJobMatchYourSkill = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.newJobMatchYourSkillService);

export const candidateMatchesYourJobRequirement = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.candidateMatchesYourJobRequirementService);

export const gentleReminder = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.gentleReminderService);

export const markedImmediateJoiner = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.markedImmediateJoinerService);

export const noLoginOrAction = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.noLoginOrActionService);

export const gotAMessage = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.gotAMessageService);

export const unifiedEmail = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.unifiedEmailService);

export const sendEmailImportEmployee = (req: Request, res: Response, next: NextFunction) =>
	run(req, res, next, cron.sendEmailImportEmployeeService);
