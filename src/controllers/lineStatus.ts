import LineStatus, { ILineStatus } from "../models/LineStatus";
import mongoose from "mongoose";

export async function create(
  line: string,
  statusSeverity: number,
  status: string,
  reason: string,
  fromDate: string,
  toDate: string
) {
  const created = new Date();
  const updated = created;
  const lineStatus = new LineStatus({
    _id: mongoose.Types.ObjectId(),
    line,
    status,
    statusSeverity,
    reason,
    fromDate,
    toDate,
    created,
    updated
  });
  await lineStatus.save();
}

export async function saveToDB(
  line: string,
  statusSeverity: number,
  status: string,
  reason: string,
  fromDate: string,
  toDate: string
) {
  await create(line, statusSeverity, status, reason, fromDate, toDate);
  console.log(`Saved status for ${line} line.`);
}

export async function findLatestStatus(line: string): Promise<ILineStatus | null> {
  const status = await LineStatus.findOne({ line })
    .sort({ created: "desc" })
    .lean()
    .exec();
  console.log(`Got the lastest status for ${line}`);
  return status;
}
