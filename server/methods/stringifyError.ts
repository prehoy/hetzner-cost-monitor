import processError from "./processError";

export default function stringifyError(e: any) {
  return JSON.stringify(processError(e));
}
