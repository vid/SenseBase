
Feature: Proxiris front-end

Scenario: Upload a PDF

  When I log into proxiris
  Then I should see an Input tab
  Then I select it
  Then I upload a unique PDF
  Then I should see an upload acknowledgement
  Then I go to the search tab
  And I enter the unique PDF text
  There should be one result

Scenario: Upload a link sheet

  When I log into proxiris
  Then I should see an Input tab
  Then I select it
  Then I select link sheet
  Then I upload an unique xls
  Then I should see an upload acknowledgement
  Then I go to the search tab
  And I select the scrape section
  Then I should see the unique xls
  And its links


