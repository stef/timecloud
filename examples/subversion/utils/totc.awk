BEGIN {
   day="0000-00-00"
   printf("var timeclouddata=")
}

{ 
   if (NR==1) {
      printf("[[\"%s\", [[\"%s\", \"%s\"]",$2, $3, $1)
   } else {
      if (day == $2) {
         printf(",[\"%s\", \"%s\"]", $3, $1)
      } else {
         printf("]],\n[\"%s\", [[\"%s\", \"%s\"]",$2, $3, $1)
         day=$2 
      }
   }
}

END { 
   printf("]]];\n")
}
