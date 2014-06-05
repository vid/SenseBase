
Feature: Human annotation

  Scenario: Create a quote annotation
    When using SenseBase as a proxy
    I should be able to select text
    And I select New annotation
    And select a type for the annotation
    And enter some description text
    And save the annotation
    Then the annotation list should update with the quote annotation

  Scenario: Create a document level annotation
    When using SenseBase as a proxy
    And I select New annotation
    And I select Document level annotation
    And select a type for the annotation
    And enter some description text
    And save the annotation
    Then the annotation list should update with the document-level annotation

