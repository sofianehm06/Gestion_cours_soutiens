import { contextBridge, ipcRenderer } from "electron";
import type { SoutienProApi } from "../shared/types";

const methods: (keyof SoutienProApi)[] = [
  "getDashboard",
  "listGroups",
  "createGroup",
  "updateGroup",
  "deleteGroup",
  "listStudents",
  "createStudent",
  "updateStudent",
  "setStudentActive",
  "deleteStudent",
  "getAttendance",
  "saveAttendance",
  "listGroupSessions",
  "listStudentAttendance",
  "getMonthlyPayments",
  "recordPayment",
  "cancelPayment",
  "listStudentPayments",
];

const api = Object.fromEntries(
  methods.map((name) => [name, (...args: unknown[]) => ipcRenderer.invoke("db", name, args)]),
) as unknown as SoutienProApi;

contextBridge.exposeInMainWorld("api", api);
