import { Router, type IRouter } from "express";
import healthRouter from "./health";
import familiesRouter from "./families";
import membersRouter from "./members";
import choresRouter from "./chores";
import transactionsRouter from "./transactions";
import expensesRouter from "./expenses";
import savingsRouter from "./savings";
import allowancesRouter from "./allowances";
import receiptsRouter from "./receipts";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(familiesRouter);
router.use(membersRouter);
router.use(choresRouter);
router.use(transactionsRouter);
router.use(expensesRouter);
router.use(savingsRouter);
router.use(allowancesRouter);
router.use(receiptsRouter);
router.use(insightsRouter);

export default router;
