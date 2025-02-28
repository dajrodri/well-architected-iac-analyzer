export const tableFilteringProperties = [
    {
      propertyLabel: 'Pillar',
      key: 'pillar',
      groupValuesLabel: 'Pillar values',
      operators: [':', '!:', '=', '!=', '^'],
    },
    {
      propertyLabel: 'Question',
      key: 'question',
      groupValuesLabel: 'Question values',
      operators: [':', '!:', '=', '!=', '^'],
    },
    {
      propertyLabel: 'Best Practice',
      key: 'name',
      groupValuesLabel: 'Best Practice values',
      operators: [':', '!:', '=', '!=', '^'],
    },
    {
      propertyLabel: 'Is Best Practice Applied?',
      key: 'applied',
      groupValuesLabel: 'Status values',
      operators: ['=', '!='],
    },
  ];
  
  export const paginationLabels = {
    nextPageLabel: 'Next page',
    previousPageLabel: 'Previous page',
    pageLabel: (pageNumber: number) => `Page ${pageNumber} of all pages`,
  };
  
  export const getMatchesCountText = (count: number) => {
    return count === 1 ? '1 match' : `${count} matches`;
  };
  
  export const propertyFilterI18nStrings = {
    filteringAriaLabel: "Filter best practices",
    filteringPlaceholder: "Filter best practices",
    clearFiltersText: "Clear filters",
    cancelActionText: "Cancel",
    applyActionText: "Apply",
    operationAndText: "and",
    operationOrText: "or",
    operatorContainsText: "Contains",
    operatorDoesNotContainText: "Does not contain",
    operatorEqualsText: "Equals",
    operatorDoesNotEqualText: "Does not equal",
    operatorStartsWithText: "Starts with",
  };