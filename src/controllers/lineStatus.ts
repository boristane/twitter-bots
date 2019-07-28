import LineStatus from "../models/LineStatus";
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
  const user = new LineStatus({
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
  await user.save();
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
}
