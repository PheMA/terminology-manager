import React, { useState, useEffect } from "react";

import { R4 } from "@ahryman40k/ts-fhir-types";

import { HTMLTable, Button, Dialog } from "@blueprintjs/core";

import { ValueSet } from "@phema/workbench-common";

import { TerminologyUtils, FHIRUtils } from "@phema/fhir-utils";

interface SearchResultsProps {
  terminologyBundle: R4.IBundle;
  searchResultsBundle: R4.IBundle;
  fhirConnection: FHIRConnection;
  addValueSetToBundle: (resource: R4.IValueSet) => void;
}

interface valueSetToExpansionProps {
  valueSet: R4.IValueSet;
}

const ValueSetExpansion: React.RC<valueSetToExpansionProps> = ({
  valueSet,
}) => {
  if (!valueSet?.expansion?.contains) {
    return null;
  }

  return <ValueSet codes={valueSet.expansion.contains} />;
};

const SearchResults: React.FC<SearchResultsProps> = ({
  terminologyBundle,
  searchResultsBundle,
  fhirConnection,
  addValueSetToBundle,
}) => {
  if (!searchResultsBundle) {
    return null;
  }

  const [valueSetToExpand, setValueSetToExpand] = useState(undefined);
  const [valueSetExpansion, setValueSetExpansion] = useState(undefined);
  const [currentlyAdding, setCurrentlyAdding] = useState(
    new Map<string, boolean>()
  );

  const addToCurrentlyAdding = (key) => {
    const newCurrentlyAdding = new Map(currentlyAdding);
    newCurrentlyAdding.set(key, true);
    setCurrentlyAdding(newCurrentlyAdding);
  };

  const removeFromCurrentlyAdding = (key) => {
    const newCurrentlyAdding = new Map(currentlyAdding);
    newCurrentlyAdding.delete(key);
    setCurrentlyAdding(newCurrentlyAdding);
  };

  useEffect(() => {
    if (!valueSetToExpand) {
      setValueSetExpansion(undefined);
      return;
    }

    TerminologyUtils.expand({
      fhirConnection,
      valueSetId: valueSetToExpand,
    }).then((valueSet) => {
      setValueSetExpansion(valueSet);
    });
  }, [valueSetToExpand]);

  if (searchResultsBundle.entry) {
    const rows = searchResultsBundle.entry.map((entry) => {
      const { resource } = entry;
      return (
        <tr key={resource.id}>
          <td>{resource.id}</td>
          <td>{resource.name}</td>
          <td>{resource.version}</td>
          <td>{resource.publisher}</td>
          <td>
            <div className="terminologyManager__searchPane__results__actions">
              <Button
                minimal
                loading={resource.id === valueSetToExpand && !valueSetExpansion}
                onClick={() => {
                  setValueSetToExpand(resource.id);
                }}
              >
                Expand
              </Button>
              <Button
                minimal
                loading={currentlyAdding.get(resource.id as string)}
                onClick={() => {
                  addToCurrentlyAdding(resource.id as string);

                  FHIRUtils.get({
                    fhirConnection: fhirConnection,
                    resourceType: "ValueSet",
                    resourceId: resource.id as string,
                  })
                    .then((valueSet) => {
                      addValueSetToBundle(valueSet, fhirConnection)
                        .then(() => {
                          removeFromCurrentlyAdding(resource.id as string);
                        })
                        .catch((err) => {
                          console.log(err);
                          removeFromCurrentlyAdding(resource.id as string);
                        });
                    })
                    .catch((err) => {
                      console.log(err);
                      removeFromCurrentlyAdding(resource.id as string);
                    });
                }}
                disabled={TerminologyUtils.bundleContainsValueSet({
                  bundle: terminologyBundle,
                  valueSet: resource,
                })}
              >
                Add
              </Button>
            </div>
          </td>
        </tr>
      );
    });

    return (
      <>
        <HTMLTable>
          <thead>
            <tr>
              <th>OID</th>
              <th>Name</th>
              <th>Version</th>
              <th>Publisher</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </HTMLTable>
        <Dialog
          title={`Codes in ${valueSetExpansion?.name} Value Set (${valueSetToExpand})`}
          className="terminologyManager__valueSetExpansion"
          isOpen={!!valueSetExpansion}
          onClose={() => {
            setValueSetExpansion(undefined);
            setValueSetToExpand(undefined);
          }}
        >
          <ValueSetExpansion valueSet={valueSetExpansion} />
        </Dialog>
      </>
    );
  } else {
    return null;
  }

  return <div>results</div>;
};

export { SearchResults };
