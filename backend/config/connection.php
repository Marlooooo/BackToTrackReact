<?php 
$serverhost="localhost";
$username="root";
$password="";

try{
   $conn=new PDO("mysql:host=$serverhost;dbname=backtotrack_db",$username,$password);
   $conn->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
}
catch(PDOException $e){
   echo json_encode([
      "status"=>"failed",
      "message"=>$e->getMessage()
   ]);
}

?>