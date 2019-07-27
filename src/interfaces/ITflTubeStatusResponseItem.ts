export interface ITflTubeStatusResponseItem {
  $type: string;
  id: string;
  name: string;
  modeName: string;
  disruptions: string[];
  created: string;
  modified: string;
  lineStatuses: ILineStatus[];
  routeSections: string[];
  serviceTypes: Array<{
    $type: string;
    name: string;
    uri: string;
  }>;
  crowding: {
    $type: string;
  };
}

export interface ILineStatus {
  $type: string;
  id: number;
  lineId: string;
  statusSeverity: number;
  statusSeverityDescription: string;
  reason?: string;
  created: string;
  validityPeriods: IValidityPeriod[];
  disruption?: {
    $type: string;
    category: string;
    categoryDescription: string;
    affectedRoutes: string[];
    affectedStops: string[];
    closureText: string;
  };
}

export interface IValidityPeriod {
  $type: string;
  fromDate: string;
  toDate: string;
  isNow: boolean;
}
