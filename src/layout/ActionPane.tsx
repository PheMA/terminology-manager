import React from "react";

import { R4 } from "@ahryman40k/ts-fhir-types";

import { FHIRServerConfig, UploadPane, DetailsPane, SearchPane } from "..";

import "./layout.scss";

enum ActionType {
  DETAILS,
  SEARCH,
  UPLOAD,
}

interface ActionPaneProps {
  action: ActionType;
  valueset?: R4.IValueSet;
  fhirServerConfig?: FHIRServerConfig;
  terminologyBundle: R4.IBundle;
  addValueSetToBundle?: (resource: R4.IValueSet) => void;
  addCodeSystemToBundle?: (resource: R4.ICodeSystem) => void;
}

const ActionPane: React.FC<ActionPaneProps> = ({
  action,
  resource,
  fhirConnection,
  terminologyBundle,
  addValueSetToBundle,
  addCodeSystemToBundle,
}) => {
  switch (action) {
    case ActionType.DETAILS:
      return <DetailsPane resource={resource} />;
    case ActionType.SEARCH:
      return (
        <SearchPane
          fhirConnection={fhirConnection}
          terminologyBundle={terminologyBundle}
          addValueSetToBundle={addValueSetToBundle}
        />
      );
    default:
      return (
        <UploadPane
          fhirConnection={fhirConnection}
          addValueSetToBundle={addValueSetToBundle}
          addCodeSystemToBundle={addCodeSystemToBundle}
        />
      );
  }
};

export { ActionPane, ActionType, ActionPaneProps };
