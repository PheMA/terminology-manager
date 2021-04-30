import React from "react";

import { R4 } from "@ahryman40k/ts-fhir-types";

interface DetailsPaneProps {
  resource: R4.IValueSet | R4.ICodeSystem;
}

const DetailsPane: React.FC<DetailPaneProps> = ({ resource }) => {
  return <div className="terminologyManager__detailsPane">Details</div>;
};

export { DetailsPane, DetailsPaneProps };
