<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE xsl:stylesheet [
 <!ENTITY newl "&#38;#xA;">
 <!ENTITY space "&#32;">
]>

<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

 <xsl:output
   method="text"
   encoding="utf-8"
   media-type="text/plain"
   omit-xml-declaration="yes"
   standalone="yes"
   indent="no" />

 <xsl:strip-space elements="*" />

 <!-- match the topmost log entry -->
 <xsl:template match="log">
  <xsl:apply-templates select="logentry" />
  <!-- add newlines at the end of the changelog -->
  <xsl:text>&newl;</xsl:text>
 </xsl:template>

 <!-- format one entry from the log -->
 <xsl:template match="logentry">
    <!-- add newline -->
    <xsl:if test="not(position()=1)">
     <xsl:text>&newl;</xsl:text>
    </xsl:if>
    <!-- date -->
    <xsl:apply-templates select="date" />
    <xsl:text>&space;</xsl:text>
    <!-- author's name -->
    <xsl:apply-templates select="author" />
 </xsl:template>

 <!-- format date -->
 <xsl:template match="date">
  <xsl:variable name="date" select="normalize-space(.)" />
  <!-- output date part -->
  <xsl:value-of select="substring($date,1,10)" />
 </xsl:template>

 <!-- format author -->
 <xsl:template match="author">
  <xsl:variable name="uid" select="normalize-space(.)" />
  <!-- try to lookup author in authorsfile -->
  <xsl:value-of select="$uid" />
 </xsl:template>

 <!-- copy but normalize text -->
 <xsl:template match="text()" mode="copy">
  <xsl:value-of select="normalize-space(.)" />
 </xsl:template>

 <!-- simple copy template -->
 <xsl:template match="@*|node()" mode="copy">
  <xsl:copy>
   <xsl:apply-templates select="@*|node()" mode="copy" />
  </xsl:copy>
 </xsl:template>
</xsl:stylesheet>
