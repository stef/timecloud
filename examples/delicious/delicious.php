<?php
/* important to set these values to access the delicious API */
define('DELICIOUS_USER', '');
define('DELICIOUS_PASS', '');

require('phpdelicious/php-delicious.inc.php');

$timeconstraint='';
if(isset($_GET['start'])) {
   $timeconstraint="&start=".$_GET['start'];
}
if(isset($_GET['end'])) {
   $timeconstraint.="&end=".$_GET['end'];
}

$days=array();
$oDelicious = new PhpDelicious(DELICIOUS_USER, DELICIOUS_PASS);
$aPosts = $oDelicious->GetAllPosts();
if ($aPosts) {
   foreach ($aPosts as $aPost) {
      list($date,$time)=explode(" ",$aPost['updated']);
      if(!isset($days[$date])) {
         $days[$date]=array('count'=>1, 'tags'=>array());
      } else {
         $days[$date]['count']+=1;
      }
      foreach($aPost['tags'] as $tag) {
         if(!isset($days[$date][$tag])) {
            $days[$date]['tags'][$tag]=1;
         } else {
            $days[$date]['tags'][$tag]+=1;
         }
      }
   }
   $result=array();
   ksort($days);
   foreach($days as $day => $opt) {
      $tags=$opt['tags'];
      $tmp=array();
      foreach(array_keys($tags) as $tag) {
         $tmp[]=array($tag,$tags[$tag]);
      }
      $result[]=array($day,$tmp);
   }
   print json_encode($result);
} else {
   echo $oDelicious->LastErrorString();
}
?>
