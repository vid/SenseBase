
Feature: sensebase front-end

Scenario: Upload a PDF

  When I log into sensebase
  Then I should see an Input tab
  Then I select it
  Then I upload a unique PDF
  Then I should see an upload acknowledgement
  Then I go to the search tab
  And I enter the unique PDF text
  There should be 1 result

Scenario: Upload a link sheet

  When I log into sensebase
  Then I should see an Input tab
  Then I select it
  Then I select link sheet
  Then I upload an unique xls
  Then I should see an upload acknowledgement
  Then I go to the search tab
  And I select the scrape section
  Then I should see the unique xls
  And its links

Scenario: Upload a zip file
  When I log into sensebase
  Then I should see an Input tab
  Then I select it
  Then I upload a zip file containing 4 documents with a unique key
  Then I go to the search tab
  And I enter the unique key
  Then I should 4 results

