import { Router } from "express";
import * as c from "../controllers/cron.controller";

/**
 * HTTP-triggered cron / ops jobs (legacy PHP Cronjob.php).
 *
 * Security: `assertOpsAllowed` — requires header `X-Ops-Key: $OPS_KEY`
 * (or `ALLOW_PUBLIC_OPS=1` / non-production without OPS_KEY).
 *
 * Mounted at `/wapi` so paths match PHP: GET /wapi/backup, /wapi/cron-notice, …
 */
const cronRouter = Router();

// A. Ops & data maintenance
cronRouter.get("/backup", c.backup);
cronRouter.get("/delete-otp", c.deleteOtp);
cronRouter.get("/update-percentage", c.updatePercentage);
cronRouter.get("/update-view-request", c.updateViewRequest);
cronRouter.get("/lat-long-update", c.latLongUpdate);
cronRouter.get("/percentage_status_reset", c.percentageStatusReset);
cronRouter.get("/update-account-setting", c.updateAccountSetting);

// B. Email scheduler pipeline
cronRouter.get("/create-email-schedule", c.createEmailSchedule);
cronRouter.get("/create-email-schedule/:id", c.createEmailScheduleById);
cronRouter.get("/send-email-schedule", c.sendEmailSchedule);
cronRouter.get("/send-email-schedule/:id", c.sendEmailScheduleById);
cronRouter.get("/final-schedule-update", c.finalScheduleUpdate);
cronRouter.get("/final-schedule-update/:id", c.finalScheduleUpdate);
cronRouter.get("/create-reschedule/:id", c.createReschedule);

// C. Campaign producers
cronRouter.get("/cron-notice", c.cronNotice);
cronRouter.get("/total-new-job-post", c.totalNewJobPost);
cronRouter.get("/job-viewed-not-applied", c.jobViewedNotApplied);
cronRouter.get("/has-not-applied-any-job", c.hasNotAppliedAnyJob);
cronRouter.get("/new-job-match-your-skill", c.newJobMatchYourSkill);
cronRouter.get("/candidate-matches-your-job-requirement", c.candidateMatchesYourJobRequirement);
cronRouter.get("/gentle-reminder", c.gentleReminder);
cronRouter.get("/marked-immidiate-joiner", c.markedImmediateJoiner); // intentional spelling
cronRouter.get("/no-login-or-action", c.noLoginOrAction);
cronRouter.get("/got-a-message", c.gotAMessage);
cronRouter.get("/unified-email", c.unifiedEmail);
cronRouter.get("/send-email-import-employee", c.sendEmailImportEmployee);

export default cronRouter;
