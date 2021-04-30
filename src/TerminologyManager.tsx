import React, { useState } from "react";

import {
  AnchorButton,
  Button,
  Tooltip,
  Toaster,
  Intent,
} from "@blueprintjs/core";

import {
  Toolbar,
  ConnectionSelector as CommonConnectionSelector,
  ListPane,
} from "@phema/workbench-common";

import { R4 } from "@ahryman40k/ts-fhir-types";
import { ActionPane } from "./index";

import "./TerminologyManager.scss";
import { ActionType } from "./layout/ActionPane";

import { TerminologyUtils, BundleUtils, FHIRUtils } from "@phema/fhir-utils";
import { TerminologyToaster } from "./TerminologyToaster";

interface TerminologyManagerProps {
  terminologyBundle?: R4.IBundle;
  fhirServerConnections: FHIRConnection[];
  onSave: (bundle: R4.IBundle) => void;
}

interface ConnectionSelectorProps {
  label: string;
  connections: FHIRConnection[];
  selected: string;
  setSelected: (uuid: string) => void;
}

const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  label,
  connections,
  selected,
  setSelected,
}) => {
  return (
    <div className="terminologyManager__backend__selector">
      {label}
      <CommonConnectionSelector
        connections={connections}
        selected={selected}
        setSelected={setSelected}
      />
    </div>
  );
};

interface SubmissionErrorsProps {
  messages: string[];
}

const SubmissionErrors: React.FC<SubmissionErrorsProps> = ({ messages }) => {
  const items = messages.map((message, idx) => <li key={idx}>{message}</li>);

  return (
    <div className="terminologyManager__submissionErrors">
      <p>
        The terminology bundle was successfully submitted, but there were the
        following issues.
      </p>
      <ul>{items}</ul>
      <p>
        In most cases this just means the code systems or value sets already
        exist.
      </p>
    </div>
  );
};

const TerminologyManager: React.FC<TerminologyManagerProps> = ({
  id,
  bundle,
  saveTerminologyBundle,
  fhirServerConnections,
  onSave,
}) => {
  const [selectedSource, setSelectedSource] = useState(undefined);
  const [selectedTarget, setSelectedTarget] = useState(undefined);
  const [currentAction, setCurrentAction] = useState(ActionType.UPLOAD);

  const addCodeSystemToBundle = (codeSystem: R4.ICodeSystem) => {
    let newBundle = BundleUtils.addResourceToBundle({
      bundle,
      resource: codeSystem,
    });

    saveTerminologyBundle(id, newBundle);
  };

  const addValueSetBundle = async (
    valueSet: R4.IValueSet,
    sourceConnection: FHIRConnection
  ) => {
    if (TerminologyUtils.bundleContainsValueSet({ bundle, valueSet })) {
      return Promise.resolve();
    }

    let newBundle = BundleUtils.addResourceToBundle({
      bundle,
      resource: valueSet,
    });

    if (sourceConnection) {
      return TerminologyUtils.extractValueSetDependencies({
        fhirConnection: findFhirConnection(selectedSource),
        valueSet,
      })
        .then((deps) => {
          deps.forEach((dep) => {
            if (dep.resourceType === "ValueSet") {
              if (
                TerminologyUtils.bundleContainsValueSet({
                  bundle,
                  valueSet: dep,
                })
              ) {
                return;
              }
            } else if (dep.resourceType === "CodeSystem") {
              if (
                TerminologyUtils.bundleContainsCodeSystem({
                  bundle,
                  codeSystem: dep,
                })
              ) {
                return;
              }
            } else {
              throw new Error("Unknown dependency type");
            }

            newBundle = BundleUtils.addResourceToBundle({
              bundle: newBundle,
              resource: dep,
            });
          });
        })
        .then(() => {
          saveTerminologyBundle(id, newBundle);
        });
    } else {
      saveTerminologyBundle(id, newBundle);
      return Promise.resolve();
    }
  };

  const removeResourceFromBundle = (index) => {
    const newBundle = BundleUtils.removeResourceFromBundle({ bundle, index });

    saveTerminologyBundle(id, newBundle);
  };

  const leftChildren = (
    <>
      <Button
        className="bp3-minimal"
        icon="upload"
        text="Upload"
        onClick={() => setCurrentAction(ActionType.UPLOAD)}
      />
      <Tooltip
        content="Select source connection to search"
        disabled={!!selectedSource}
      >
        <AnchorButton
          className="bp3-minimal"
          icon="search"
          text="Search"
          disabled={!selectedSource}
          onClick={() => setCurrentAction(ActionType.SEARCH)}
        />
      </Tooltip>
      <Tooltip
        content="Select target connection to submit"
        disabled={!!selectedTarget}
      >
        <AnchorButton
          className="bp3-minimal"
          icon="send-message"
          text="Submit"
          disabled={!selectedTarget}
          onClick={() => {
            const fhirConnection = findFhirConnection(selectedTarget);

            FHIRUtils.submitBundle({
              fhirConnection,
              bundle,
            })
              .then((responseBundle) => {
                const issues = BundleUtils.collectErrorMessages({
                  bundle: responseBundle,
                });

                if (issues.length > 0) {
                  TerminologyToaster.show({
                    message: <SubmissionErrors messages={issues} />,
                    intent: Intent.WARNING,
                    icon: "warning-sign",
                    className: "terminologyManager__warningToast",
                  });
                } else {
                  TerminologyToaster.show({
                    message: `Successfully posted bundle to ${
                      fhirConnection.name || fhirConnection.fhirBaseUrl
                    }.`,
                    intent: Intent.SUCCESS,
                    icon: "tick",
                  });
                }
              })
              .catch((err) => {
                TerminologyToaster.show({
                  message: `Error posting terminology bundle: ${err}.`,
                  intent: Intent.DANGER,
                  icon: "warning-sign",
                });
              });
            onSave(bundle);
          }}
        />
      </Tooltip>
      <Button
        className="bp3-minimal"
        icon="download"
        text="Download"
        onClick={() => {
          const download = (filename, content) => {
            var element = document.createElement("a");
            element.setAttribute(
              "href",
              "data:application/json;charset=utf-8," +
                encodeURIComponent(content)
            );
            element.setAttribute("download", filename);

            element.style.display = "none";
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
          };

          download("Terminology.bundle.json", JSON.stringify(bundle, " ", 2));
        }}
      />
    </>
  );

  const rightChildren = (
    <>
      <ConnectionSelector
        label="Source: "
        connections={fhirServerConnections}
        selected={selectedSource}
        setSelected={setSelectedSource}
      />
      <ConnectionSelector
        label="Target: "
        connections={fhirServerConnections}
        selected={selectedTarget}
        setSelected={setSelectedTarget}
      />
    </>
  );

  const findFhirConnection = (uuid) => {
    return fhirServerConnections.find((connection) => connection.id === uuid);
  };

  return (
    <div className="terminologyManager__wrapper">
      <Toolbar
        title="TERMINOLOGY MANAGER"
        className="terminologyManager__toolbar"
        leftChildren={leftChildren}
        rightChildren={rightChildren}
      />
      <div className="terminologyManager__window">
        <div className="terminologyManager__window__list">
          <ListPane
            bundle={bundle}
            removeResourceFromBundle={removeResourceFromBundle}
            toaster={TerminologyToaster}
          />
        </div>
        <ActionPane
          action={currentAction}
          fhirConnection={findFhirConnection(selectedSource)}
          terminologyBundle={bundle}
          addValueSetToBundle={addValueSetBundle}
          addCodeSystemToBundle={addCodeSystemToBundle}
        />
      </div>
    </div>
  );
};

export { TerminologyManager, TerminologyManagerProps };
