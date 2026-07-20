import { Router } from "express";
import multer from "multer";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import {
	createUserGroupSchema, assignPermissionSchema, removePermissionSchema, removeGroupRoleSchema, idParamsSchema, sendOtpMergeSchema,
	verifyOtpMergeSchema, mergeUserRegisterSchema, aiGenerateRowSchema,
} from "../types/account-migration.types";
import * as c from "../controllers/account-migration.controller";

/**
 * Account migration & company role/permission management.
 * Mounted at `/wapi`. Company context: header `X-Company`.
 */
const accountMigrationRouter = Router();
const formData = multer().none();

accountMigrationRouter.get("/checkip", c.checkip);
accountMigrationRouter.post("/ai-generate-row", formData, validateData(aiGenerateRowSchema), c.aiGenerateRow);
accountMigrationRouter.get("/digilocker", c.digilocker);
accountMigrationRouter.get("/nonclaim-company", c.nonclaimCompany);
accountMigrationRouter.get("/default-user-list", c.defaultUserList);
accountMigrationRouter.get("/switch-account/:token", c.switchAccount);
accountMigrationRouter.get("/reminder-veification-pending", c.reminderVerificationPending);

accountMigrationRouter.post("/create-user-group", Authorization, formData, validateData(createUserGroupSchema), c.createUserGroup);
accountMigrationRouter.post("/create-user-group/:id", Authorization, formData, validateData(createUserGroupSchema), c.createUserGroup);
accountMigrationRouter.post("/assign-user-permission", Authorization, formData, validateData(assignPermissionSchema), c.assignUserPermission);
accountMigrationRouter.post("/assign-user-permission/:id", Authorization, formData, validateData(assignPermissionSchema), c.assignUserPermission);
accountMigrationRouter.get("/menus/events", Authorization, c.menuEventList);
accountMigrationRouter.get("/user-group", Authorization, c.userGroupList);
accountMigrationRouter.get("/group-user-list", Authorization, c.groupUserList);
accountMigrationRouter.get("/user-permission-list", Authorization, c.userPermissionList);
accountMigrationRouter.get("/edit-user-permission/:id", Authorization, validateData(idParamsSchema), c.editUserPermission);
accountMigrationRouter.put("/remove-permission", Authorization, formData, validateData(removePermissionSchema), c.removePermission);
accountMigrationRouter.get("/all-role-group", Authorization, c.allRoleGroup);
accountMigrationRouter.get("/edit-group-role/:id", Authorization, validateData(idParamsSchema), c.editGroupRole);
accountMigrationRouter.put("/remove-group-role", Authorization, formData, validateData(removeGroupRoleSchema), c.removeGroupRole);
accountMigrationRouter.get("/doctype-list", Authorization, c.doctypeList);
accountMigrationRouter.get("/company-doctype-list", Authorization, c.doctypeList);
accountMigrationRouter.post("/send-otp-account-merge", Authorization, formData, validateData(sendOtpMergeSchema), c.sendOtpAccountMerge);
accountMigrationRouter.post("/otp-verify-account-merge", Authorization, formData, validateData(verifyOtpMergeSchema), c.otpVerifyAccountMerge);
accountMigrationRouter.post("/merge-user-register", Authorization, formData, validateData(mergeUserRegisterSchema), c.mergeUserRegister);
accountMigrationRouter.delete("/revoke-delete-account", Authorization, c.revokeDeleteAccount);

export default accountMigrationRouter;
