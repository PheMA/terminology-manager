import React, { useState, useEffect, useCallback } from "react";

import { R4 } from "@ahryman40k/ts-fhir-types";

import { useDebouncedCallback } from "use-debounce";

import { SearchUtils } from "@phema/fhir-utils";

import "./SearchPane.scss";
import { FormGroup, InputGroup, Spinner } from "@blueprintjs/core";

import { SearchResults } from "./SearchResults";

interface SearchPaneProps {
  fhirConnection: FHIRConnection;
  addValueSetToBundle: (resource: R4.IValueSet) => void;
  terminologyBundle: R4.IBundle;
}

const SearchPane: React.FC<SearchPaneProps> = ({
  fhirConnection,
  addValueSetToBundle,
  terminologyBundle,
}) => {
  const [processing, setProcessing] = useState(false);

  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");

  const [searchResultsBundle, setSearchResultsBundle] = useState(undefined);

  const performSearch = (canonicalUrl, name, identifier, fhirConnection) => {
    if (!canonicalUrl && !name && !identifier) {
      setSearchResultsBundle(undefined);
      return;
    }

    const parameters = {
      url: canonicalUrl,
      name,
      identifier,
    };

    setProcessing(true);

    SearchUtils.search({
      fhirConnection,
      resourceType: "ValueSet",
      parameters,
    })
      .then((resultBundle) => {
        setProcessing(false);
        setSearchResultsBundle(resultBundle);
      })
      .catch((err) => {
        setProcessing(false);
        console.log("Search Error", err);
      });
  };

  const [debouncedSearch, cancel] = useDebouncedCallback(
    (canonicalUrl, name, identifier, fhirConnection) => {
      performSearch(canonicalUrl, name, identifier, fhirConnection);
    },
    1000
  );

  useEffect(() => {
    debouncedSearch(canonicalUrl, name, identifier, fhirConnection);
  }, [canonicalUrl, name, identifier, fhirConnection]);

  const main = processing ? (
    <div className="terminologyManager__uploadPane__spinner">
      <Spinner />
    </div>
  ) : (
    <div className="terminologyManager__searchPane__results">
      <SearchResults
        terminologyBundle={terminologyBundle}
        searchResultsBundle={searchResultsBundle}
        fhirConnection={fhirConnection}
        addValueSetToBundle={addValueSetToBundle}
      />
    </div>
  );

  return (
    <div className="terminologyManager__searchPane">
      <div className="terminologyManager__searchPane__inputs">
        <FormGroup label="Canonical URL" labelFor="canonical-url" inline={true}>
          <InputGroup
            id="canonical-url"
            leftIcon="globe-network"
            onChange={(event) => {
              setCanonicalUrl(event.target.value);
            }}
            placeholder="http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.2.25"
            value={canonicalUrl}
            round={true}
          />
        </FormGroup>
        <FormGroup label="Name" labelFor="valueset-name" inline={true}>
          <InputGroup
            id="valueset-name"
            leftIcon="cube"
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="Heart Failure"
            value={name}
            round={true}
          />
        </FormGroup>
        <FormGroup label="Identifier" labelFor="valueset-id" inline={true}>
          <InputGroup
            id="valueset-id"
            leftIcon="tag"
            onChange={(event) => {
              setIdentifier(event.target.value);
            }}
            placeholder="2.16.840.1.113762.1.4.1096.82"
            value={identifier}
            round={true}
          />
        </FormGroup>
      </div>
      {main}
    </div>
  );
};

export { SearchPane, SearchPaneProps };
