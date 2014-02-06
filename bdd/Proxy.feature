Feature: Using Proxiris as a proxy

Scenario: View page annotations

  When I configure my browser as a proxy
  And I go to a site
  Then I should see the login form
  Then I fill in my login info
  Then I should see the requested site
  And it should have the Proxiris instrumentation


