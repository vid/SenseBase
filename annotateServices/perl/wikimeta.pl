use strict;
#########################################
#
# Sample API Script for interrogation of
# NLGbAse engine
#
# V 1.0 Wen 10 nov 2011 - Dr E.Charton
# more info on - www.nlgbase.org
#              - www.wikimeta.com
#
# contact author at 
# www.echarton.com/contact.html
#
#########################################
my $apiserver = "http://www.wikimeta.com/wapi/service"; ### the name of the server you will use
my $account = $ARGV[0]; ### Change this to your API account reference (section "Your API key" of the account interface) 
open(in, $ARGV[1]) || die "no in file $ARGV[1]\n"; ### the buffer limit is near 50 ko here

my $a ="";
while(<in>){
  $a = $a . $_;
}
my $labels = NLGBASEAPI($apiserver, $account , $a);
#print out $labels;
print $labels;

#################################
# How to detect errors
#################################
# <error msg=ref>unknown user $useraccount</error>
# <error msg=overlimit>$useraccount:exceed day limit</error>
# <error msg=ref>two much datas</error>
# <error msg=datalimit>$apipostlimit</error>
# 
# Errors tags are returned by NLGBASEAPI
# to detect them :
# if ( $labels =~ /<error/ ) { ... }

close(out);
close(in);


#########################################
# 
# Transmission method
#
#########################################
sub NLGBASEAPI{

  use LWP::UserAgent; 
  use URI::URL;
  
  ### get commands
  my(@args) = @_;
  my $apiserveur = $args[0]; ### Server name / nom du serveur
  my $apiaccount = $args[1]; ### Account name / nom du compte
  my $sentence = $args[2];   ### Text to label / phrase à traiter

  ### Other possible options
  # span          ### define span -> span => 100
  # threshold     ### define threshold  -> threshold => 0.1
  # lng         ### force langage EN, FR, ES, default is Auto -> lng => "FR"
  # formated      ### return exactly the same sequence of line:word - usefull for tests -> formated => 1  
  # semtag        ### only named entity labelling 0 or with semantic label 1 -> best performances if you need only NE
  # textmining    ### calculates textmining data
  
  
  my $url_var = "$apiserveur";

  my $ua = new LWP::UserAgent;
  my $url = new URI::URL($url_var);

  $ua->default_header('Accept' => "json"); ### available xml/json

  my $response = $ua->post($url, 
  {   api =>  $apiaccount, 
    contenu => $sentence,
    textmining => 1,
    ## To include an option, just
    ## introduce it here like
    # span => 200
  });

  ### Success or error
  my $content = "";
  if ($response->is_success) 
  {
    ### get the answer  
    $content = $response->content; 
  }
  else {
    $content = $response->status_line;
    print "[erreur API]$content\n";
  }

return($content);
}
