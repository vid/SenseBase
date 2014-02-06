
Feature: Annotators

Scenario: Demarcate page

  When an html page is input with a known URL
  Then it should match a site demarker
  And it should match a content demarker
  And content should extract from that selection

Scenario: Annotate page

  When an html page is input
  And content is extracted
  Then annotate services should run
  And annotations should be returned


