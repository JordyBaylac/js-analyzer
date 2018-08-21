/**
 * Copyright Farelogix, Inc.
 * Created by Armando Perez, 2015
 */

_include("JS_NDCTransactionScope.js");
_include("JS_FLXTransactionScope.js");

JsDCAirShopping.prototype = new JsBaseAirShopping();

var pepe = "asd";

try {

    var asd= "dd";

} catch(e) {

}

/**
 * JsDCAirShopping object constructor for DC AirShopping transaction
 * @constructor
 */
function JsDCAirShopping() {

    /**
     * DC AirShopping request validation
     */
    this.DCRequestValidation = function() {

        this.BaseRequestValidation();

        if (this.domRequest.Root.GetAttribute("validated") != "true") {
            var strBrandedFareSupport = this.IsAppSettingEnabled("EnableBrandedFares")? "Y": "N";
            this.domRequest.Root.SetAttribute("BrandedFareSupport", strBrandedFareSupport);

            if (this.domRequest.Root.SelectSingle("CoreQuery/OriginDestinations"))
                AddSaleInfo(this);

            // checks different preferences
            if (this.IsCalendar() && !this.preferenceCalendar)
                AddRemark({domResponse: this.domRequest, strText: "Calendar search preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("Preferences/Preference/FlightPreferences/Aircraft/Classes/Class") && !this.preferenceClassOfService)
                AddRemark({domResponse: this.domRequest, strText: "ClassOfService preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("Preference/FlightPreferences/Aircraft/Classes/Class") && !this.preferenceClassOfService)
                AddRemark({domResponse: this.domRequest, strText: "ClassOfService preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("Preferences/Preference/CabinPreferences/CabinType") && !this.preferenceCabin)
                AddRemark({domResponse: this.domRequest, strText: "Cabin preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("Preference/CabinPreferences/CabinType") && !this.preferenceCabin)
                AddRemark({domResponse: this.domRequest, strText: "Cabin preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("CoreQuery/OriginDestinations/OriginDestination/Departure/Time") && !this.preferenceTime)
                AddRemark({domResponse: this.domRequest, strText: "Time preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("Parameters/Pricing/FeeExemption") && !this.preferenceTaxExemption)
                AddRemark({domResponse: this.domRequest, strText: "Tax exemption preference is not supported for this carrier."});

            // validates ClassOfService preference
            if (this.domRequest.Root.SelectSingle("Preferences/Preference/FlightPreferences/Aircraft/Classes/Class") && !this.preferenceClassOfService) {
                var nsPreferences = this.domRequest.SelectNodes(this.domRequest.Root, "Preferences/Preference[FlightPreferences/Aircraft/Classes/Class]");
                if (nsPreferences) {
                    for (var indexPreference = (nsPreferences.Count - 1); indexPreference >= 0; indexPreference--)
                        nsPreferences.GetItem(indexPreference).Delete();
                }
            }

            // validates ClassOfService preference
            if (this.domRequest.Root.SelectSingle("Preference/FlightPreferences/Aircraft/Classes/Class") && !this.preferenceClassOfService) {
                var nsPreferences = this.domRequest.SelectNodes(this.domRequest.Root, "Preference[FlightPreferences/Aircraft/Classes/Class]");
                if (nsPreferences) {
                    for (var indexPreference = (nsPreferences.Count - 1); indexPreference >= 0; indexPreference--)
                        nsPreferences.GetItem(indexPreference).Delete();
                }
            }

            // validates Cabin preference
            if (this.domRequest.Root.SelectSingle("Preferences/Preference/CabinPreferences/CabinType") && !this.preferenceCabin) {
                var nsPreferences = this.domRequest.SelectNodes(this.domRequest.Root, "Preferences/Preference[CabinPreferences/CabinType]");
                if (nsPreferences) {
                    for (var indexPreference = (nsPreferences.Count - 1); indexPreference >= 0; indexPreference--)
                        nsPreferences.GetItem(indexPreference).Delete();
                }
            }

            // validates Cabin preference
            if (this.domRequest.Root.SelectSingle("Preference/CabinPreferences/CabinType") && !this.preferenceCabin) {
                var nsPreferences = this.domRequest.SelectNodes(this.domRequest.Root, "Preference[CabinPreferences/CabinType]");
                if (nsPreferences) {
                    for (var indexPreference = (nsPreferences.Count - 1); indexPreference >= 0; indexPreference--)
                        nsPreferences.GetItem(indexPreference).Delete();
                }
            }

            // validates TaxExemption preference
            if (this.domRequest.Root.SelectSingle("Parameters/Pricing/FeeExemption") && !this.preferenceTaxExemption)
                this.domRequest.Root.SelectSingle("Parameters/Pricing/FeeExemption").Delete();

            // validates traveler(s)
            var nsTravelers = this.domRequest.Root.Select("Travelers/Traveler/child::node()|DataLists/PassengerList/Passenger");
            if (nsTravelers) {
                for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                    var nodeTraveler = nsTravelers.GetItem(indexTraveler);

                    var strPaxType = nodeTraveler.SelectSingle("PTC").NormalizedText;
                    // adds Age in case is missing and its can be calculated
                    if (!nodeTraveler.SelectSingle("Age/Value") && ((Number(strPaxType.substring(1, 3)) > 0) || nodeTraveler.SelectSingle("Age/BirthDate")))
                        AddTravelerAge({transaction: this, nodeTraveler: nodeTraveler, strPaxType: strPaxType, strDate: (this.ageCalculator == "arrival")?this.ItineraryArrivalDate() : this.ItineraryDepartureDate()});
                }
            }

            // validates OriginDestination(s)
            var nsODs = this.domRequest.SelectNodes(this.domRequest.Root, "CoreQuery/child::node()/OriginDestination");
            if (nsODs) {
                for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                    var nodeOD = nsODs.GetItem(indexOD);

                    // validates Time preference
                    if (nodeOD.SelectSingle("Departure/Time") && !this.preferenceTime)
                        nodeOD.SelectSingle("Departure/Time").Delete();

                    // validates calendar dates preference
                    if (this.IsCalendar()) {
                        var nodeCalendarDates = nodeOD.SelectSingle("CalendarDates");
                        // checks if Calendar shopping is supported
                        if (this.preferenceCalendar) {
                            var strDaysBefore = nodeCalendarDates.GetAttribute("DaysBefore");
                            if (strDaysBefore && (Number(strDaysBefore) <= '0'))
                                nodeCalendarDates.RemoveAttribute("DaysBefore");

                            var strDaysAfter = nodeCalendarDates.GetAttribute("DaysAfter");
                            if (strDaysAfter && (Number(strDaysAfter) <= '0'))
                                nodeCalendarDates.RemoveAttribute("DaysBefore");

                            if (!nodeCalendarDates.GetAttribute("DaysBefore") && !nodeCalendarDates.GetAttribute("DaysAfter"))
                                nodeCalendarDates.Delete();
                            else {
                                // adds calendar dates to request
                                var dateToday = new Date();
                                var strDate = nodeOD.SelectSingle("Departure/Date").NormalizedText;
                                var dateDeparture = new Date(strDate.substring(0, 4), strDate.substring(5, 7) - 1, strDate.substring(8, 10));

                                strDaysBefore = nodeCalendarDates.GetAttribute("DaysBefore");
                                if (strDaysBefore && Number(strDaysBefore)) {
                                    var arrBeforeDates = dateDeparture.GetBeforeDates(Number(strDaysBefore));
                                    if (arrBeforeDates) {
                                        for (var indexBeforeDate = 0; indexBeforeDate < arrBeforeDates.length; indexBeforeDate++) {
                                            var strBeforeDate = arrBeforeDates[indexBeforeDate];
                                            var dateBefore = new Date(strBeforeDate.substring(0, 4), strBeforeDate.substring(5, 7) - 1, strBeforeDate.substring(8, 10));
                                            if ((dateBefore - dateToday + 86400000) > 0) {
                                                // adds calendar dates to request
                                                var nodeCalendarDate = this.domRequest.CreateElementNode("Date");
                                                var nodeCalendarDateText = this.domRequest.CreateTextNode(strBeforeDate);
                                                nodeCalendarDate.AppendChild(nodeCalendarDateText);
                                                nodeCalendarDates.AppendChild(nodeCalendarDate);
                                            }
                                        }

                                        if (nodeCalendarDates.SelectSingle("Date"))
                                            nodeCalendarDates.SelectSingle("Date[last()]").SetAttribute("date", "earliest");
                                    }
                                }

                                strDaysAfter = nodeCalendarDates.GetAttribute("DaysAfter");
                                if (strDaysAfter && Number(strDaysAfter)) {
                                    var arrAfterDays = dateDeparture.GetAfterDates(Number(strDaysAfter));
                                    if (arrAfterDays) {
                                        for (var indexAfterDate = 0; indexAfterDate < arrAfterDays.length; indexAfterDate++) {
                                            var strAfterDate = arrAfterDays[indexAfterDate];

                                            // Add calendar dates to request
                                            var nodeCalendarDate = this.domRequest.CreateElementNode("Date");
                                            var nodeCalendarDateText = this.domRequest.CreateTextNode(strAfterDate);
                                            nodeCalendarDate.AppendChild(nodeCalendarDateText);
                                            nodeCalendarDates.AppendChild(nodeCalendarDate);
                                        }

                                        if (nodeCalendarDates.SelectSingle("Date"))
                                            nodeCalendarDates.SelectSingle("Date[last()]").SetAttribute("date", "latest");
                                    }
                                }
                            }
                        }
                        else
                            nodeCalendarDates.Delete();
                    }
                }
            }

            // marks end of validation
            this.domRequest.Root.SetAttribute("validated", "true");

            if (this.showTrace)
                TraceXml("(" + this.airlineId + ") " + __file__, "* Request validation", this.domRequest.XML);

            // updates string request from validated DOM request
            this.requestXML = this.domRequest.XML;
        }
    };

    this.DCRequestValidation();

    /**
     * DC AirShopping response validation
     * @param {xxDomDocument} domAirShoppingRS
     */
    this.DCResponseValidation = function(domAirShoppingRS) {

        // validates AirlineOffer(s)
        var nsAirlineOffers = domAirShoppingRS.SelectNodes(domAirShoppingRS.Root, "OffersGroup/AirlineOffers/AirlineOffer|OffersGroup/AirlineOffers/Offer");
        if (nsAirlineOffers)
            for (var indexAirlineOffer = 0; indexAirlineOffer < nsAirlineOffers.Count; indexAirlineOffer++) {
                var nodeAirlineOffer = nsAirlineOffers.GetItem(indexAirlineOffer);

                nodeAirlineOffer.RemoveAttribute("odKey");
            }

        // encrypts FareRefKey's
        var nsFareRefKeys = domAirShoppingRS.SelectNodes(domAirShoppingRS.Root, "Metadata/Other/OtherMetadata/CodesetMetadatas/CodesetMetadata/AugmentationPoint/AugPoint/FareRefKeyNO");
        if (nsFareRefKeys)
            for (var indexFareRefKey = 0; indexFareRefKey < nsFareRefKeys.Count; indexFareRefKey++) {
                var nodeFareRefKey = nsFareRefKeys.GetItem(indexFareRefKey);

                nodeFareRefKey.ReplaceText({domXML: domAirShoppingRS, strValue: nodeFareRefKey.NormalizedText.Encrypt()});
            }

        // validates OriginDestinationList
        var nodeOriginDestinationList = domAirShoppingRS.Root.SelectSingle("DataLists/OriginDestinationList");
        var nsODs = this.domRequest.SelectNodes(this.domRequest.Root, "CoreQuery/child::node()/OriginDestination[@OriginDestinationKey]");
        if (nodeOriginDestinationList && nsODs) {
            // validates number of bounds between request and response match
            if (nodeOriginDestinationList.Children().Count != nsODs.Count)
                throw "719#No fares available.";

            // reorders OD's in case its not matching the order in reques
            if (nodeOriginDestinationList && nsODs && (nsODs.Count > 1))
                for (var indexOD = (nsODs.Count - 1); indexOD >= 0; indexOD--) {
                    var strOriginDestinationKey = nsODs.GetItem(indexOD).GetAttribute("OriginDestinationKey");

                    var nodeOD = nodeOriginDestinationList.SelectSingle("OriginDestination[@OriginDestinationKey = \"" + strOriginDestinationKey + "\"]");
                    if (nodeOD) {
                        nodeOD.Remove();
                        if (nodeOriginDestinationList.FirstChild)
                            nodeOriginDestinationList.FirstChild.InsertBefore(nodeOD);
                        else
                            nodeOriginDestinationList.AppendChild(nodeOD);
                    }
                }
        }

        // validates FareList
        var nsFareGroups = domAirShoppingRS.SelectNodes(domAirShoppingRS.Root, "DataLists/FareList/FareGroup");
        if (nsFareGroups)
            for (var indexFareGroup = 0; indexFareGroup < nsFareGroups.Count; indexFareGroup++) {
                var nodeFareGroup = nsFareGroups.GetItem(indexFareGroup);

                if (nodeFareGroup.SelectSingle("FareBasisCode[@odKey or @rbd or @fareBrand]")) {
                    var nodeFareBasisCode = nodeFareGroup.SelectSingle("FareBasisCode")

                    nodeFareBasisCode.RemoveAttribute("odKey");
                    nodeFareBasisCode.RemoveAttribute("cabin");
                    nodeFareBasisCode.RemoveAttribute("fareBrand");
                }
            }

        // deletes FareCalcLine if it exists
        var nsFareCalcLines = domAirShoppingRS.SelectNodes(domAirShoppingRS.Root, "OffersGroup/AirlineOffers/AirlineOffer/PricedOffer/OfferPrice/FareDetail/FareCalcLine");
        if (nsFareCalcLines)
            for (var indexFareCalcLine = (nsFareCalcLines.Count - 1); indexFareCalcLine >= 0; indexFareCalcLine--)
                nsFareCalcLines.GetItem(indexFareCalcLine).Delete();

        this.BaseResponseValidation(domAirShoppingRS);
    };

    /**
     * Validates and returns final shopping response
     * @param {xxDomDocument|string} airShoppingRS
     */
    this.SetClientResponse = function(airShoppingRS) {

        var domAirShoppingRS = airShoppingRS;
        if (typeof(airShoppingRS) == "string") {
            domAirShoppingRS = new xxDomDocument();
            domAirShoppingRS.PreserveWhitespace = true;
            domAirShoppingRS.LoadXML(airShoppingRS);
        }

        this.DCResponseValidation(domAirShoppingRS);

        if (this.showLog) {
            this.getLog();

            domAirShoppingRS.Root.SetAttribute("duration", this.logs[this.logs.length - 1].substring(this.logs[this.logs.length - 1].indexOf(":") + 1));
        }

        SetClientResponse(domAirShoppingRS.XML);
    };

    /**
     * Performs shopping call for the configured pricing provider
     * @param {String} strAirShoppingRQ
     * @returns {xxDomDocument}
     */
    this.Shop = function(strAirShoppingRQ) {

        // builds pricing provider tc
        var domPricingTC = BuildPricingTC({domTC: this.domTC, nodeProvider: this.GetProvider()});

        var providerPricing = new JsXXServer(domPricingTC);
        providerPricing.Stateless(true);

        return providerPricing.SendTransaction({strXXServerRequest: strAirShoppingRQ, endTransaction: true});
    };

    /**
     * Adds Age for travaler based on date passed by
     * @param {{transaction: JsNDCTransaction, nodeTraveler: xxNode, strPaxType: String, strDate: String}} parameters
     */
    function AddTravelerAge(parameters) {

        var strAge = parameters.strPaxType.substring(1, 3);

        var nodeBirthDate = parameters.nodeTraveler.SelectSingle("Age/BirthDate");
        if (nodeBirthDate)
        // overrides or adds age based on the date of birth and the departure date years
            strAge = CalculateYears({strBirthDate: nodeBirthDate.NormalizedText, strDate: parameters.strDate});

        if (Number(strAge) >= 0) {
            // adds age to the traveler
            var nodeValue = parameters.transaction.domRequest.CreateElementNode("Value");
            var nodeValueText = parameters.transaction.domRequest.CreateTextNode(Number(strAge).toString());
            nodeValue.SetAttribute("UOM", "Years");

            var nodeAge = parameters.nodeTraveler.SelectSingle("Age");
            if (!nodeAge) {
                nodeAge = parameters.transaction.domRequest.CreateElementNode("Age");

                var nodeName = parameters.nodeTraveler.SelectSingle("Name");
                if (nodeName)
                    nodeName.InsertBefore(nodeAge);
                else
                    parameters.nodeTraveler.AppendChild(nodeAge);
            }

            nodeValue.AppendChild(nodeValueText);

            if (nodeBirthDate)
                nodeBirthDate.InsertBefore(nodeValue);
            else
                nodeAge.AppendChild(nodeValue);

            if (parameters.nodeTraveler.SelectSingle("PTC").NormalizedText.indexOf("NN") > -1 || parameters.nodeTraveler.SelectSingle("PTC").NormalizedText == "CHD")
                parameters.nodeTraveler.SelectSingle("PTC").SetAttribute("PaxPriced", parameters.nodeTraveler.SelectSingle("PTC").GetAttribute("PaxPriced").substring(0, 1) + ((strAge.length == 1)? "0" + strAge: strAge));
        }
    }

    /**
     * Builds cache availability cache key
     * @returns {String}
     */
    this.GetAvailabilityCacheKey = function() {

        var strAvailabilityCacheKey = "";

        var nsODs = this.domRequest.SelectNodes(this.domRequest.Root, "CoreQuery/OriginDestinations/OriginDestination");
        if(nsODs) {
            for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                var nodeOD = nsODs.GetItem(indexOD);

                strAvailabilityCacheKey += this.airlineId + ":";
                strAvailabilityCacheKey += this.pcc + ":";
                strAvailabilityCacheKey += nodeOD.SelectSingle("Departure/AirportCode").NormalizedText + ":";
                strAvailabilityCacheKey += nodeOD.SelectSingle("Departure/Date").NormalizedText + ":";
                strAvailabilityCacheKey += nodeOD.SelectSingle("Arrival/AirportCode").NormalizedText + ":";
            }
        }

        return strAvailabilityCacheKey;
    };

    /**
     * Builds cache shopping cache key
     * @returns {String}
     */
    this.GetShopppingCacheKey = function() {

        var strShoppingCacheKey = this.GetAvailabilityCacheKey();

        var nsTravelers = this.domRequest.SelectNodes(this.domRequest.Root, "CoreQuery/Travelers/Traveler");
        if (nsTravelers) {
            for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                var nodeTraveler = nsTravelers.GetItem(indexTraveler);

                var strPTC = nodeTraveler.FirstChild.SelectSingle("PTC").NormalizedText;
                if (!(strShoppingCacheKey.indexOf(strPTC) > -1)) {
                    var nsTravelersPTC = this.domRequest.SelectNodes(this.domRequest.Root, "CoreQuery/Travelers/Traveler/child::node()[PTC = \"" + strPTC + "\"]");

                    strShoppingCacheKey += nsTravelersPTC.Count.toString();
                    strShoppingCacheKey += strPTC + ":";
                }
            }
        }

        if (this.domRequest.Root.SelectSingle("Preferences/Preference/FarePreferences/Types/Type[Code = \"70J\"]"))
            strShoppingCacheKey += "70J:";
        if (this.domRequest.Root.SelectSingle("Preferences/Preference/FarePreferences/Types/Type[Code = \"749\"]"))
            strShoppingCacheKey += "749:";

        if (this.domRequest.Root.GetAttribute("BrandedFareSupport") == "Y")
            strShoppingCacheKey += "Branded:";

        return strShoppingCacheKey;
    };

    /**
     * Calculates cache expiration time
     * @param {{strDate: String, cacheRate: number}} parameters
     * @returns {number}
     */
    function GetCacheExpiration(parameters) {

        if (parameters.strDate && parameters.cacheRate) {
            var date = new Date();
            var month = Number(parameters.strDate.substring(5, 7)) - 1;
            var dateExpiration = new Date(parameters.strDate.substring(0, 4), month.toString(), parameters.strDate.substring(8));

            var dateDifference = parseInt(dateExpiration - date); //date difference in milliseconds
            var cacheExpire = parseInt(dateDifference) * parameters.cacheRate; // milliseconds
            cacheExpire = Math.round(cacheExpire * 100) / 100000;

            return cacheExpire;
        }

        return 0;
    }

    /**
     * Stores AirAvailabilityRS in cache
     * @param {{strCacheKey: String, strAirAvailabilityRS: String}} parameters
     */
    this.StoreAvailabilityInCache = function(parameters) {

        var isCacheEnabled = this.IsAppSettingEnabled("EnableAvailabilityCache");
        var strCacheRate = this.GetAppSettingValue("AvailabilityCacheRate");

        if (isCacheEnabled && strCacheRate && (Number(strCacheRate) > 0)) {
            TraceXml(__file__, "* Storing availability response in cache with key " + parameters.strCacheKey, parameters.strAirAvailabilityRS);

            SetCacheData("AirAvailability", parameters.strCacheKey, parameters.strAirAvailabilityRS, GetCacheExpiration({strDate: this.ItineraryDepartureDate(), cacheRate: Number(strCacheRate)}));
        }
    };

    /**
     * Stores AirShoppingRS in cache
     * @param {{strCacheKey: String, strAirShoppingRS: String}} parameters
     */
    this.StoreShoppingInCache = function(parameters) {

        var isCacheEnabled = this.IsAppSettingEnabled("EnableFareSearchCache");
        var strCacheRate = this.GetAppSettingValue("FareSearchCacheRate");

        if (isCacheEnabled && strCacheRate && (Number(strCacheRate) > 0)) {
            TraceXml(__file__, "* Storing shopping response in cache with key " + parameters.strCacheKey, parameters.strAirShoppingRS);

            SetCacheData("AirShopping", parameters.strCacheKey, parameters.strAirShoppingRS, GetCacheExpiration({strDate: this.ItineraryDepartureDate(), cacheRate: Number(strCacheRate)}));
        }
    };

    /**
     * Returns cached AirAvailabilityRS
     * @param {String} strCacheKey
     * @returns {String}
     */
    this.GetCachedAvailability = function(strCacheKey) {

        if (this.IsAppSettingEnabled("EnableAvailabilityCache")) {
            var strCachedResponse = GetCacheData("AirAvailability", strCacheKey);
            if (strCachedResponse) {
                TraceXml(__file__, "Cached availability response for key " + strCacheKey, strCachedResponse);

                return strCachedResponse;
            }
        }

        return "";
    };

    /**
     * Returns cached AirShoppingRS
     * @param {String} strCacheKey
     * @returns {String}
     */
    this.GetCachedShopping = function(strCacheKey) {

        if (this.IsAppSettingEnabled("EnableFareSearchCache")) {
            var strCachedResponse = GetCacheData("AirShopping", strCacheKey);
            if (strCachedResponse) {
                TraceXml(__file__, "Cached shopping response for key " + strCacheKey, strCachedResponse);

                return strCachedResponse;
            }
        }

        return "";
    };

    /**
     * Builds DC availability request
     * @param {{airShopping: JsDCAirShopping, isCalendar: Boolean}} parameters
     * @returns {String}
     */
    function BuildAirAvailabilityRQ(parameters) {

        if (parameters.airShopping.showTrace) TraceXml(__file__, "* FLX AirAvailabilityRQ input" + ((parameters.isCalendar)? " calendar": ""), (parameters.isCalendar)? parameters.airShopping.domRequest.XML: parameters.airShopping.domRequest.XML.removesAllBetween({strStartMatch: "<CalendarDates", strEndMatch: "</CalendarDates>"}));
        var strAirAvailabilityRQ = parameters.airShopping.xslt.Transform("jsCore/xslt/NDCAirShoppingRQ_FLXAirAvailablityRQ.xsl", (parameters.isCalendar)? parameters.airShopping.domRequest.XML: parameters.airShopping.domRequest.XML.removesAllBetween({strStartMatch: "<CalendarDates", strEndMatch: "</CalendarDates>"}));
        if (!strAirAvailabilityRQ)
            throw "144#Could not transform request.";
        if (parameters.airShopping.showTrace) TraceXml(__file__, "* FLX AirAvailabilityRQ output" + ((parameters.isCalendar)? " calendar": ""), strAirAvailabilityRQ);

        return strAirAvailabilityRQ;
    };

    /**
     * Builds DC availability response
     * @param {{airShopping: JsDCAirShopping, strAvailabilityRS: String}} parameters
     * @returns {String}
     */
    function BuildAirAvailabilityRS(parameters) {

        if (parameters.airShopping.showTrace) TraceXml(__file__, "* FLX AirAvailabilityRS input", parameters.strAvailabilityRS);
        var strAirAvailabilityRS = parameters.airShopping.xslt.Transform("jsCore/xslt/FLXAirAvailablityRS.xsl", parameters.strAvailabilityRS);
        if (!strAirAvailabilityRS)
            throw "144#Could not transform request.";
        if (parameters.airShopping.showTrace) TraceXml(__file__, "* FLX AirAvailabilityRS output", strAirAvailabilityRS);

        return strAirAvailabilityRS;
    };

    /**
     * Gets DC availability
     */
    this.GetAvailability = function () {

        var domAirAvailabilityRS = new xxDomDocument();
        // gets cached availability
        var strAirAvailabilityRS = this.GetCachedAvailability(this.GetAvailabilityCacheKey());
        if (!strAirAvailabilityRS) {
            // builds AirAvailabilty request
            var strAirAvailabilityRQ = BuildAirAvailabilityRQ({airShopping: this, isCalendar: false});

            if (this.IsCalendar()) {
                var arrAirAvailabilityRQs = [];
                arrAirAvailabilityRQs.push(strAirAvailabilityRQ);

                // adds calendar request
                strAirAvailabilityRQ = BuildAirAvailabilityRQ({airShopping: this, isCalendar: true});
                arrAirAvailabilityRQs.push(strAirAvailabilityRQ);

                var providerDC = new JSXXAsyncServer({domTC: this.domTC, requestsNumber: arrAirAvailabilityRQs.length});
                providerDC.Stateless(true);

                // calls async availability
                var arrAirAvailabilityRSs = providerDC.SendTransactions(arrAirAvailabilityRQs);

                domAirAvailabilityRS.LoadXML(arrAirAvailabilityRSs[0].AddXML(arrAirAvailabilityRSs[1]));
            }
            else {
                var providerDC = new JsXXServer(this.domTC);
                // calls availability
                domAirAvailabilityRS = this.serverSync.sendDC({strXXServerRequest: strAirAvailabilityRQ, native: false, logs: this.logs, endTransaction: true});
            }
        }
        else
            domAirAvailabilityRS.LoadXML(strAirAvailabilityRS);

        // checks availability errors
        if (domAirAvailabilityRS.Root.SelectSingle("InfoGroup[Error/Text]"))
            throw "DC#" + domAirAvailabilityRS.Root.SelectSingle("InfoGroup[Error/Text]").XML;

        // stores availability cache
        this.StoreAvailabilityInCache({strCacheKey: this.GetAvailabilityCacheKey(), strAirAvailabilityRS: domAirAvailabilityRS.XML});

        this.domRequest.LoadXML(this.domRequest.XML.AddXML(BuildAirAvailabilityRS({airShopping: this, strAvailabilityRS: domAirAvailabilityRS.XML.AddXML(this.domRequest.XML).AddXML(strAirAvailabilityRQ)})));

        // removes Flight/OriginDestination's if inventory is empty
        var nsODS = this.domRequest.Root.Select("AirAvailabilityRS/OriginDestination");
        if (nsODS)
            for (var indexOD = (nsODS.Count - 1); indexOD >= 0; indexOD--) {
                var nodeOD = nsODS.GetItem(indexOD);

                var nsFlights = nodeOD.Select("Flight");
                if (nsFlights)
                    for (var indexFlight = (nsFlights.Count - 1); indexFlight >= 0; indexFlight--) {
                        var nodeFlight = nsFlights.GetItem(indexFlight);

                        // removes Flight if inventory for at least one of its segment(s) is empty
                        if (nodeFlight.SelectSingle("Segment[not(Classes)]"))
                            nodeFlight.Delete();
                    }

                // removes OriginDestination has no Flights
                if (!nodeOD.SelectSingle("Flight"))
                    // if requested OriginDestination has no Flights throw error
                    if (nodeOD.GetAttribute("matchDate") == "Y")
                        throw "180000101";
                    else
                        nodeOD.Delete();
            }

        // updates string request from validated DOM request
        this.requestXML = this.domRequest.XML;
    };

    /**
     * Builds ServiceList request
     * @returns {xxDomDocument}
     */
    this.BuildServiceListRQ = function () {

        var domServiceListRQ = new xxDomDocument();
        domServiceListRQ.LoadXML("<ServiceListRQ/>");

        var nsTravelers = this.domRequest.SelectNodes(this.domRequest.Root, "Travelers/Traveler");
        if (nsTravelers) {
            for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                var nodeTraveler = nsTravelers.GetItem(indexTraveler).FirstChild;

                var nodeTravelerIDs = domServiceListRQ.CreateElementNode("TravelerIDs");
                nodeTravelerIDs.SetAttribute("AssociationID", nodeTraveler.GetAttribute("ObjectKey"));
                nodeTravelerIDs.SetAttribute("PaxType", nodeTraveler.SelectSingle("PTC").NormalizedText);

                domServiceListRQ.Root.AppendChild(nodeTravelerIDs);
            }
        }

        var nsODs = this.domRequest.SelectNodes(this.domRequest.Root, "CoreQuery/OriginDestinations/OriginDestination");
        if (nsODs) {
            for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                var nodeOD = nsODs.GetItem(indexOD);
                var nodeOriginDestination = domServiceListRQ.CreateElementNode("OriginDestination");
                var nodeFlight = domServiceListRQ.CreateElementNode("Flight");
                nodeFlight.SetAttribute("AssociationID", "F" + (indexOD + 1));

                var nodeAirlineCode = domServiceListRQ.CreateElementNode("AirlineCode");
                var nodeAirlineCodeText = domServiceListRQ.CreateTextNode(this.airlineId);
                nodeAirlineCode.AppendChild(nodeAirlineCodeText);
                nodeFlight.AppendChild(nodeAirlineCode);

                var nodeFlightNumber = domServiceListRQ.CreateElementNode("FlightNumber");
                var nodeFlightNumberText = domServiceListRQ.CreateTextNode("1111");
                nodeFlightNumber.AppendChild(nodeFlightNumberText);
                nodeFlight.AppendChild(nodeFlightNumber);

                var nodeDate = domServiceListRQ.CreateElementNode("Date");
                var nodeDateText = domServiceListRQ.CreateTextNode(nodeOD.SelectSingle("Departure/Date").NormalizedText);
                nodeDate.AppendChild(nodeDateText);

                var nodeTime = domServiceListRQ.CreateElementNode("Time");
                var nodeTimeText = domServiceListRQ.CreateTextNode("00:01");
                nodeTime.AppendChild(nodeTimeText);

                var nodeDeparture = domServiceListRQ.CreateElementNode("Departure");

                var nodeDepAirportCode = domServiceListRQ.CreateElementNode("AirportCode");
                var nodeDepAirportCodeText = domServiceListRQ.CreateTextNode(nodeOD.SelectSingle("Departure/AirportCode").NormalizedText);
                nodeDepAirportCode.AppendChild(nodeDepAirportCodeText);

                nodeDeparture.AppendChild(nodeDepAirportCode);
                nodeDeparture.AppendChild(nodeDate);
                nodeDeparture.AppendChild(nodeTime);
                nodeFlight.AppendChild(nodeDeparture);

                var nodeArrival = domServiceListRQ.CreateElementNode("Arrival");

                var nodeArrAirportCode = domServiceListRQ.CreateElementNode("AirportCode");
                var nodeArrAirportCodeText = domServiceListRQ.CreateTextNode(nodeOD.SelectSingle("Arrival/AirportCode").NormalizedText);
                nodeArrAirportCode.AppendChild(nodeArrAirportCodeText);

                nodeArrival.AppendChild(nodeArrAirportCode);
                nodeArrival.AppendChild(nodeDate.Clone());
                nodeFlight.AppendChild(nodeArrival);

                nodeOriginDestination.AppendChild(nodeFlight);
                domServiceListRQ.Root.AppendChild(nodeOriginDestination);
            }
        }

        return domServiceListRQ;
    };

    /**
     * Checks eligibility for different criteria
     * @param {String} strFLXMConfig
     * @returns {Boolean}
     */
    this.IsEligible = function (strFLXMConfig) {

        try {
            var domFLXMTC = BuildFLXMTC({domTC: this.domTC, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: strFLXMConfig});
            var providerFLXM = new JsXXServer(domFLXMTC);

            providerFLXM.SendTransaction({strXXServerRequest: this.BuildServiceListRQ().XML, endTransaction: true});

            return !(providerFLXM.IsErrorResponse());
        }
        catch (error) {}

        return false;
    };

    /**
     * Updates the AirlineOffer/PricedOffer/OfferPrice/RequestedDate/PriceDetail/Taxes elements with amount deducted
     * @param {{domAirShoppingRS: xxDomDocument, nodeTaxes: xxNode, amount: Number}} parameters
     * @returns {String}
     */
    function DeductAmount(parameters) {

        if (parameters.nodeTaxes && parameters.amount) {
            // Taxes
            var nodeTaxesAmount = parameters.nodeTaxes.SelectSingle("Total");
            if (nodeTaxesAmount)
                nodeTaxesAmount.ReplaceText({domXML: parameters.domAirShoppingRS, strValue: (Number(nodeTaxesAmount.NormalizedText) - parameters.amount).toString()});

            // OfferPrice
            var nodeOfferPriceTotalAmount = parameters.nodeTaxes.Parent.SelectSingle("TotalAmount/DetailCurrencyPrice/Total");
            if (nodeOfferPriceTotalAmount)
                nodeOfferPriceTotalAmount.ReplaceText({domXML: parameters.domAirShoppingRS, strValue: (Number(nodeOfferPriceTotalAmount.NormalizedText) - parameters.amount).toString()});

            var travelerCount = 1;
            var nodeTravelerReferences = parameters.nodeTaxes.Parent.Parent.SelectSingle("Associations/AssociatedTraveler/TravelerReferences");
            if (nodeTravelerReferences)
                travelerCount = nodeTravelerReferences.NormalizedText.split(" ").length;

            // AirlineOffer
            var nodeAirlineOfferTotalPrice = parameters.nodeTaxes.Parent.Parent.Parent.Parent.Parent.SelectSingle("TotalPrice/DetailCurrencyPrice/Total");
            if (nodeAirlineOfferTotalPrice)
                nodeAirlineOfferTotalPrice.ReplaceText({domXML: parameters.domAirShoppingRS, strValue: (Number(nodeAirlineOfferTotalPrice.NormalizedText) - (parameters.amount*travelerCount)).toString()});
        }
    }

    /**
     * Removes all taxes supplied(but or only depending on exclude flag) and deducts amount based on flag from each FareGroup
     * @param {{domAirShoppingRS: xxDomDocument, arrTaxes: Array, exclude: Boolean, deductAmount: Boolean}} parameters
     * @returns {String}
     */
    this.RemoveTaxes = function(parameters) {

        var nsPriceDetails = parameters.domAirShoppingRS.SelectNodes(parameters.domAirShoppingRS.Root, "OffersGroup/AirlineOffers/AirlineOffer/PricedOffer/OfferPrice/RequestedDate/PriceDetail[Taxes/Breakdown/Tax]");
        if (nsPriceDetails) {
            for (var indexPrice = 0; indexPrice < nsPriceDetails.Count; indexPrice++) {
                var nodeTaxes = nsPriceDetails.GetItem(indexPrice).SelectSingle("Taxes");

                var nodeTax = nodeTaxes.SelectSingle("Breakdown/Tax");
                while (nodeTax) {
                    var strTaxCode = nodeTax.SelectSingle("TaxCode").NormalizedText;
                    var nodeNextTax = nodeTax.NextSibling;

                    if (parameters.arrTaxes && parameters.arrTaxes.length > 0) {
                        if ((parameters.exclude && !(parameters.arrTaxes.indexOf(strTaxCode) > -1) || (!parameters.exclude && parameters.arrTaxes.indexOf(strTaxCode) > -1))) {
                            if (parameters.deductAmount)
                                DeductAmount({domAirShoppingRS: parameters.domAirShoppingRS, nodeTaxes: nodeTaxes, amount: Number(nodeTax.SelectSingle("Amount").NormalizedText)});

                            nodeTax.Delete();
                        }
                    }
                    else
                        nodeTax.Delete();

                    nodeTax = nodeNextTax;
                }
            }
        }

        var nsPrices = parameters.domAirShoppingRS.SelectNodes(parameters.domAirShoppingRS.Root, "OffersGroup/AirlineOffers/AirlineOffer/PricedOffer/OfferPrice/FareDetail/FareComponent/PriceBreakdown/Price[Taxes/Breakdown/Tax]");
        if (nsPrices) {
            for (var indexFareComponent = 0; indexFareComponent < nsPrices.Count; indexFareComponent++) {
                var nodeTaxes = nsPrices.GetItem(indexFareComponent).SelectSingle("Taxes");

                var nodeTax = nodeTaxes.SelectSingle("Breakdown/Tax");
                while (nodeTax) {
                    var strTaxCode = nodeTax.SelectSingle("TaxCode").NormalizedText;
                    var nodeNextTax = nodeTax.NextSibling;

                    if (parameters.arrTaxes && parameters.arrTaxes.length > 0) {
                        if ((parameters.exclude && !(parameters.arrTaxes.indexOf(strTaxCode) > -1) || (!parameters.exclude && parameters.arrTaxes.indexOf(strTaxCode) > -1))) {
                            nodeTax.Remove();
                            nodeTax.Delete();
                        }
                    }
                    else {
                        nodeTax.Remove();
                        nodeTax.Delete();
                    }

                    nodeTax = nodeNextTax;
                }
            }
        }

        TraceXml("(" + this.airlineId + ") " + __file__, ((parameters.exclude)? "* Remove taxes but": "* Remove taxes only") + " (" + parameters.arrTaxes + ")", parameters.domAirShoppingRS.XML);
    };
}

JsDCFareSearch.prototype = new JsBaseFareSearch();

/**
 * JsDCFareSearch object constructor for DC FareSearch transaction
 * @constructor
 * @param {function} AirlineRequestValidation
 */
function JsDCFareSearch(AirlineRequestValidation) {

    this.isShopping = true;

    /**
     * Builds ServiceList request
     * @returns {String}
     */
    this.BuildServiceListRQ = function () {

        if (this.showTrace) TraceXml(__file__, "* ServiceListRQ input", this.domRequest.XML.AddXML(this.tc));
        var strServiceListRQ = this.xslt.Transform("jsCore/xslt/FLXFareSearchRQ_FLXServiceListRQ.xsl", this.domRequest.XML.AddXML(this.tc));
        if (!strServiceListRQ)
            throw "144#Could not transform request.";
        if (this.showTrace) TraceXml(__file__, "* ServiceListRQ output", strServiceListRQ);

        return strServiceListRQ;
    };

    /**
     * DC FareSearch request validation
     */
    this.DCRequestValidation = function() {

        this.BaseRequestValidation();
		
		// updates the ApplyShopping AppSetting
        this.UpdateAppSetting({key: "ApplyShopping", value: this.providerName});

        if (!this.isFlightSpecific && (this.domRequest.Root.GetAttribute("validated") != "true")) {

            AddSaleInfo(this);

            // checks different preferences
            if (this.IsCalendar() && !this.preferenceCalendar)
                AddInfoGroup({domResponse: this.domRequest, strText: "Calendar search preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("OriginDestination/Preferences/ClassOfService") && !this.preferenceClassOfService)
                AddInfoGroup({domResponse: this.domRequest, strText: "ClassOfService preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("OriginDestination/Preferences/Cabin") && !this.preferenceCabin)
                AddInfoGroup({domResponse: this.domRequest, strText: "Cabin preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("OriginDestination/Preferences[Time or TimeWindow]") && !this.preferenceTime)
                AddInfoGroup({domResponse: this.domRequest, strText: "Time preference is not supported for this carrier."});
            if (this.domRequest.Root.SelectSingle("PricingInfo/TaxExemption") && !this.preferenceTaxExemption)
                AddInfoGroup({domResponse: this.domRequest, strText: "Tax exemption is not supported for this carrier."});

            // validates TaxExemption preference
            if (this.domRequest.Root.SelectSingle("PricingInfo/TaxExemption") && !this.preferenceTaxExemption)
                this.domRequest.Root.SelectSingle("PricingInfo/TaxExemption").Delete();

            // validates OriginDestination(s)
            var nsODs = this.domRequest.SelectNodes(this.domRequest.Root, "OriginDestination");
            if (nsODs) {
                for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                    var nodeOD = nsODs.GetItem(indexOD);
                    var strDate = nodeOD.SelectSingle("Date")? nodeOD.SelectSingle("Date").NormalizedText: nodeOD.SelectSingle("Departure/Date").NormalizedText;

                    var depCode = nodeOD.SelectSingle("Departure/CityCode")? nodeOD.SelectSingle("Departure/CityCode").NormalizedText: nodeOD.SelectSingle("Departure/AirportCode").NormalizedText;
                    var arrCode = nodeOD.SelectSingle("Arrival/CityCode")? nodeOD.SelectSingle("Arrival/CityCode").NormalizedText: nodeOD.SelectSingle("Arrival/AirportCode").NormalizedText;
                    if(strDate.length > 10 && depCode && arrCode)
                        throw "420200017#Invalid departure date from " + depCode + " to " + arrCode;

                    var dateDeparture = new Date(strDate.substring(0, 4), strDate.substring(5, 7) - 1, strDate.substring(8, 10));

                    // validates max days into the future
                    if (this.futureDays > -1) {
                        var startDate = new Date();
                        var endDate = new Date();
                        endDate.setDate(startDate.getDate() + this.futureDays);

                        if(dateDeparture > endDate)
                            throw "180000101#" + startDate.toString() + "|" + endDate.toString();
                    }

                    // validates ClassOfService preference
                    if (nodeOD.SelectSingle("Preferences/ClassOfService") && !this.preferenceClassOfService)
                        nodeOD.SelectSingle("Preferences/ClassOfService").Delete();

                    // validates Cabin preference
                    if (nodeOD.SelectSingle("Preferences/Cabin") && !this.preferenceCabin)
                        nodeOD.SelectSingle("Preferences/Cabin").Delete();

                    // validates Time preference
                    if (nodeOD.SelectSingle("Preferences[Time or TimeWindow]") && !this.preferenceTime) {
                        if (nodeOD.SelectSingle("Preferences/Time"))
                            nodeOD.SelectSingle("Preferences/Time").Delete();

                        if (nodeOD.SelectSingle("Preferences/TimeWindow"))
                            nodeOD.SelectSingle("Preferences/TimeWindow").Delete();
                    }

                    // validates calendar dates
                    if (this.IsCalendar()) {
                        var nodeDayWindow = nodeOD.SelectSingle("Preferences/DayWindow");
                        // checks if Calendar shopping is supported
                        if (this.preferenceCalendar) {
                            if (nodeDayWindow) {
                                var strDaysBefore = (nodeDayWindow.SelectSingle("DaysBefore"))? nodeDayWindow.SelectSingle("DaysBefore").NormalizedText: "-1";
                                if (nodeDayWindow.SelectSingle("DaysBefore") && (Number(strDaysBefore) <= '0'))
                                    nodeDayWindow.SelectSingle("DaysBefore").Delete();

                                var strDaysAfter = (nodeDayWindow.SelectSingle("DaysAfter"))? nodeDayWindow.SelectSingle("DaysAfter").NormalizedText: "-1";
                                if (nodeDayWindow.SelectSingle("DaysAfter") && (Number(strDaysAfter) <= '0'))
                                    nodeDayWindow.SelectSingle("DaysAfter").Delete();

                                if (!nodeDayWindow.SelectSingle("DaysBefore") && !nodeDayWindow.SelectSingle("DaysAfter"))
                                    nodeDayWindow.Delete();
                                else {
                                    // adds calendar dates to request
                                    var dateToday = new Date();

                                    var arrBeforeDates = dateDeparture.GetBeforeDates(Number(strDaysBefore));
                                    if (arrBeforeDates) {
                                        for (var indexBeforeDate = 0; indexBeforeDate < arrBeforeDates.length; indexBeforeDate++) {
                                            var strBeforeDate = arrBeforeDates[indexBeforeDate];
                                            var dateBefore = new Date(strBeforeDate.substring(0, 4), strBeforeDate.substring(5, 7) - 1, strBeforeDate.substring(8, 10));
                                            if ((dateBefore - dateToday) > 0) {
                                                // adds calendar before dates to request
                                                var nodeCalendarDate = this.domRequest.CreateElementNode("Date");
                                                var nodeCalendarDateText = this.domRequest.CreateTextNode(strBeforeDate);
                                                nodeCalendarDate.AppendChild(nodeCalendarDateText);
                                                nodeDayWindow.AppendChild(nodeCalendarDate);
                                            }
                                        }

                                        if (nodeDayWindow.SelectSingle("Date"))
                                            nodeDayWindow.SelectSingle("Date[last()]").SetAttribute("date", "earliest");
                                    }

                                    var arrAfterDays = dateDeparture.GetAfterDates(Number(strDaysAfter));
                                    if (arrAfterDays) {
                                        for (var indexAfterDate = 0; indexAfterDate < arrAfterDays.length; indexAfterDate++) {
                                            var strAfterDate = arrAfterDays[indexAfterDate];

                                            // adds calendar after dates to request
                                            var nodeCalendarDate = this.domRequest.CreateElementNode("Date");
                                            var nodeCalendarDateText = this.domRequest.CreateTextNode(strAfterDate);
                                            nodeCalendarDate.AppendChild(nodeCalendarDateText);
                                            nodeDayWindow.AppendChild(nodeCalendarDate);
                                        }

                                        if (nodeDayWindow.SelectSingle("Date"))
                                            nodeDayWindow.SelectSingle("Date[last()]").SetAttribute("date", "latest");
                                    }
                                }
                            }
                        }
                        else
                            nodeDayWindow.Delete();
                    }
                }
            }

            // marks end of validation
            this.domRequest.Root.SetAttribute("validated", "true");

            if (this.showTrace)
                TraceXml("(" + this.airlineId + ") " + __file__, "* Request validation", this.domRequest.XML);

            // updates string request from validated DOM request
            this.requestXML = this.domRequest.XML;
        }
    };

    this.DCRequestValidation();

    /**
     * DC FareSearch response validation
     * @param {xxDomDocument} domFareSearchRS
     */
    this.DCResponseValidation = function(domFareSearchRS) {

        // appends informational messages from request validation
        var nsTexts = this.domRequest.SelectNodes(this.domRequest.Root, "InfoGroup/ForInfo/Text")
        if (nsTexts) {
            for (var indexText = 0; indexText < nsTexts.Count; indexText++)
                AddInfoGroup({domResponse: domFareSearchRS, strText: nsTexts.GetItem(indexText).NormalizedText});
        }

        // deletes CurrencyConversions
        var nodeCurrencyConversions = domFareSearchRS.Root.SelectSingle("CurrencyConversions");
        if (nodeCurrencyConversions)
            nodeCurrencyConversions.Delete();

        // validates brands
        var nsODs = domFareSearchRS.Root.Select("FareGroup/OriginDestination[PriceClassComments]");
        if (nsODs)
            for(var indexOD = (nsODs.Count - 1); indexOD >= 0; indexOD--) {
                var nodeOD = nsODs.GetItem(indexOD);

                var nsPriceClassComments = nodeOD.Select("PriceClassComments");
                if(nsPriceClassComments)
                    for(var indexPriceClass = (nsPriceClassComments.Count - 1); indexPriceClass >= 0; indexPriceClass--) {
                        var nodePriceClassComment = nsPriceClassComments.GetItem(indexPriceClass);

                        var strPriceClassName = nodePriceClassComment.GetAttribute("PriceClassName");
                        var strPriceClassCode = nodePriceClassComment.GetAttribute("PriceClassCode");
                        var nsDuplicatePriceClassComments = domFareSearchRS.Root.Select("FareGroup/OriginDestination[position() = " + (indexOD + 1) + "]/PriceClassComments[./@PriceClassName = '" + strPriceClassName + "' and ./@PriceClassCode = '" + strPriceClassCode + "']");
                        // deletes duplicate brand column(s)
                        if(nsDuplicatePriceClassComments.Count > 1)
                            nodePriceClassComment.Delete();
                        else {
                            // deletes empty brand column(s) and combinability references when no fares associated and preference is on
                            if(!domFareSearchRS.Root.Select("FareGroup/OriginDestination/Flight/PriceGroup/PriceClass[./@Name = '" + strPriceClassName + "' and ./@Code = '" + strPriceClassCode + "']") && this.removeBrand) {
                                // deletes combinability references
                                var strPriceClassCode = nodePriceClassComment.GetAttribute("PriceClassCode");
                                if (strPriceClassCode) {
                                    var nsFareBrands = domFareSearchRS.Root.Select("FareGroup/OriginDestination/PriceClassComments/Combinability/FareBrand[text() = \"" + strPriceClassCode + "\"]");
                                    if (nsFareBrands)
                                        for(var indexFareBrand = (nsFareBrands.Count - 1); indexFareBrand >= 0; indexFareBrand--)
                                            nsFareBrands.GetItem(indexFareBrand).Delete();
                                }

                                // deletes empty brand column(s)
                                nodePriceClassComment.Delete();
                            }

                            // deletes all combinability not referenced
                            var nsFareBrands = nodeOD.Select("PriceClassComments/Combinability/FareBrand");
                            if (nsFareBrands)
                                for(var indexFareBrand = (nsFareBrands.Count - 1); indexFareBrand >= 0; indexFareBrand--) {
                                    var nodeFareBrand = nsFareBrands.GetItem(indexFareBrand);

                                    if(!domFareSearchRS.Root.Select("FareGroup/OriginDestination/PriceClassComments[@PriceClassCode = \"" + nodeFareBrand.NormalizedText + "\"]")) {
                                        if (!nodeFareBrand.Parent.FirstChild.NextSibling)
                                            nodeFareBrand.Parent.Delete();
                                        else
                                            nodeFareBrand.Delete();
                                    }
                                }
                        }

                        // adds ColumnOrder if missing
                        if (!nodePriceClassComment.GetAttribute("ColumnOrder")) {
                            for (var indexBrands = 0; indexBrands < this.brands.length; indexBrands++) {
                                if (nodePriceClassComment.GetAttribute("PriceClassName") == this.brands[indexBrands].brandName) {
                                    nodePriceClassComment.SetAttribute("ColumnOrder", (indexBrands + 1).toString());
                                    break;
                                }
                            }
                        }

                    }
            }

		// removes ValidatingCarrier
        if(this.removeValidatingCarrier) {
            var nsValidatingCarriers = domFareSearchRS.SelectNodes(domFareSearchRS.Root, "FareGroup/ValidatingCarrier");
            if(nsValidatingCarriers)
                for(var indexValidatingCarrier = (nsValidatingCarriers.Count - 1); indexValidatingCarrier >= 0; indexValidatingCarrier--)
                    nsValidatingCarriers.GetItem(indexValidatingCarrier).Delete();
        }

        // Fill out missing prices
        var nodeFareGroup = domFareSearchRS.Root.SelectSingle("FareGroup");
        if (nodeFareGroup && !nodeFareGroup.GetAttribute("TotalPrice")) {
            var totalLowestPrice = 0;
            var totalHigestPrice = 0;

            var nsTravelerGroups = domFareSearchRS.Root.Select("FareGroup/TravelerGroup[PriceRange]");
            if (nsTravelerGroups)
                for (var indexTravelerGroup = 0; indexTravelerGroup < nsTravelerGroups.Count; indexTravelerGroup++) {
                    var nodeTravelerGroup = nsTravelerGroups.GetItem(indexTravelerGroup);

                    if (nodeTravelerGroup.SelectSingle("TravelerIDRef")) {
                        var typeLowestPrice = 0;
                        var typeHigestPrice = 0;
                        var nodePriceRange = nodeTravelerGroup.SelectSingle("PriceRange");
                        var strTravelerIDRef = nodeTravelerGroup.Select("TravelerIDRef").GetItem(0).NormalizedText;

                        var nsODs = nodeFareGroup.Select("OriginDestination");
                        if (nsODs)
                            for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                                var nodeOD = nsODs.GetItem(indexOD);

                                var boundLowestPrice = 0;
                                var boundHigestPrice = 0;
                                var nsPriceClasses = nodeOD.Select("Flight/PriceGroup/PriceClass");
                                if (nsPriceClasses)
                                    for (var indexPriceClass = 0; indexPriceClass < nsPriceClasses.Count; indexPriceClass++) {
                                        var totalPriceClass = Number(nsPriceClasses.GetItem(indexPriceClass).SelectSingle("Price[./@Total and ./TravelerIDRef = \"" + strTravelerIDRef + "\"]").GetAttribute("Total"));

                                        // updates highest
                                        if (totalPriceClass > boundHigestPrice) boundHigestPrice = totalPriceClass;

                                        // updates lowest
                                        if ((totalPriceClass < boundLowestPrice) || (boundLowestPrice == 0)) boundLowestPrice = totalPriceClass;
                                    }

                                typeLowestPrice += boundLowestPrice;
                                typeHigestPrice += boundHigestPrice;
                            }

                        nodePriceRange.SetAttribute("LowestPrice", typeLowestPrice);
                        nodePriceRange.SetAttribute("HighestPrice", typeHigestPrice);


                        var typeCount = Number(nodeTravelerGroup.GetAttribute("TypeCount"));
                        var nsMatchTravelerGroups = nodeFareGroup.Select("TravelerGroup[./TravelerIDRef and ./@TypeRequested = \"" + nodeTravelerGroup.GetAttribute("TypeRequested") + "\" and ./@TypePriced = \"" + nodeTravelerGroup.GetAttribute("TypePriced") + "\" and not(./TravelerIDRef = \"" + nodeTravelerGroup.ValueOfSelect("TravelerIDRef") + "\")]");
                        if (nsMatchTravelerGroups)
                            for (var indexMatchTravelerGroup = 0; indexMatchTravelerGroup < nsMatchTravelerGroups.Count; indexMatchTravelerGroup++) {
                                var nodeMatchTravelerGroup = nsMatchTravelerGroups.GetItem(indexMatchTravelerGroup);

                                var strMatchTravelerIDRef = nodeMatchTravelerGroup.ValueOfSelect("TravelerIDRef");
                                nodeTravelerGroup.SelectSingle("TravelerIDRef").InsertAfter(nodeMatchTravelerGroup.SelectSingle("TravelerIDRef"));
                                typeCount++;

                                var nsPriceClasses = nodeFareGroup.Select("OriginDestination/Flight/PriceGroup/PriceClass");
                                if (nsPriceClasses)
                                    for (var indexPriceClass = 0; indexPriceClass < nsPriceClasses.Count; indexPriceClass++) {
                                        var nodePriceClass = nsPriceClasses.GetItem(indexPriceClass);

                                        var nsPriceSegmentPerPTC = nodePriceClass.Select("PriceSegment[TravelerIDRef = \"" + strTravelerIDRef + "\"]");
                                        if (nsPriceSegmentPerPTC)
                                            for (var indexPriceSegmentPerPTC = 0; indexPriceSegmentPerPTC < nsPriceSegmentPerPTC.Count; indexPriceSegmentPerPTC++) {
                                                var nodePriceSegmentPerPTC = nsPriceSegmentPerPTC.GetItem(indexPriceSegmentPerPTC);

                                                var strSegmentIDRef = nodePriceSegmentPerPTC.ValueOfSelect("SegmentIDRef");
                                                if (strSegmentIDRef) {
                                                    nodePriceSegmentPerPTC.SelectSingle("TravelerIDRef[last()]").InsertAfter(nodePriceClass.SelectSingle("PriceSegment[./TravelerIDRef = \"" + strMatchTravelerIDRef + "\" and ./SegmentIDRef = \"" + strSegmentIDRef + "\"]/TravelerIDRef").Clone());
                                                    nodePriceClass.SelectSingle("PriceSegment[./TravelerIDRef = \"" + strMatchTravelerIDRef + "\" and ./SegmentIDRef = \"" + strSegmentIDRef + "\"]").Delete();
                                                }
                                            }

                                        nodePriceClass.SelectSingle("Price[TravelerIDRef = \"" + strTravelerIDRef + "\"]/TravelerIDRef[last()]").InsertAfter(nodePriceClass.SelectSingle("Price[TravelerIDRef = \"" + strMatchTravelerIDRef + "\"]/TravelerIDRef").Clone());
                                        nodePriceClass.SelectSingle("FareRules[TravelerIDRef = \"" + strTravelerIDRef + "\"]/TravelerIDRef[last()]").InsertAfter(nodePriceClass.SelectSingle("FareRules[TravelerIDRef = \"" + strMatchTravelerIDRef + "\"]/TravelerIDRef").Clone());

                                        nodePriceClass.SelectSingle("Price[TravelerIDRef = \"" + strMatchTravelerIDRef + "\"]").Delete();
                                        nodePriceClass.SelectSingle("FareRules[TravelerIDRef = \"" + strMatchTravelerIDRef + "\"]").Delete();
                                    }
                            }

                        nodeTravelerGroup.SetAttribute("TypeCount", typeCount.toString());
                        nodeTravelerGroup.SetAttribute("TypeTotalPrice", (typeLowestPrice * typeCount));
                        nodeTravelerGroup.SetAttribute("TypeTotalHighest", (typeHigestPrice * typeCount));
                        nodeTravelerGroup.SetAttribute("TypeTotalLowest", (typeLowestPrice * typeCount));

                        totalLowestPrice += (typeLowestPrice * typeCount);
                        totalHigestPrice += (typeHigestPrice * typeCount);
                    }
                    else
                        nodeTravelerGroup.Delete();
                }

            nodeFareGroup.SetAttribute("TotalLowestPrice", totalLowestPrice);
            nodeFareGroup.SetAttribute("TotalHighestPrice", totalHigestPrice);
            nodeFareGroup.SetAttribute("TotalPrice", totalLowestPrice);
        }
        else {
            // groups TravelerGroup's for itinerary base Solution
            var nsFareGroups = domFareSearchRS.Root.Select("FareGroup[not(TravelerGroup/PriceRange)]");
            if (nsFareGroups)
                for (var indexFareGroup = 0; indexFareGroup < nsFareGroups.Count; indexFareGroup++) {
                    var nodeFareGroup = nsFareGroups.GetItem(indexFareGroup);

                    var nsTravelerGroups = nodeFareGroup.Select("TravelerGroup[./@TypeRequested and ./@TypePriced]");
                    if (nsTravelerGroups)
                        for (var indexTravelerGroup = 0; indexTravelerGroup < nsTravelerGroups.Count; indexTravelerGroup++) {
                            var nodeTravelerGroup = nsTravelerGroups.GetItem(indexTravelerGroup);

                            // checks for non grouped TravelerGroup's
                            if (nodeTravelerGroup.SelectSingle("TravelerIDRef")) {
                                var nsMatchTravelerGroups = nodeFareGroup.Select("TravelerGroup[./TravelerIDRef and ./@TypeRequested = \"" + nodeTravelerGroup.GetAttribute("TypeRequested") + "\" and ./@TypePriced = \"" + nodeTravelerGroup.GetAttribute("TypePriced") + "\" and not(./TravelerIDRef = \"" + nodeTravelerGroup.ValueOfSelect("TravelerIDRef") + "\")]");
                                if (nsMatchTravelerGroups)
                                    for (var indexMatchTravelerGroup = 0; indexMatchTravelerGroup < nsMatchTravelerGroups.Count; indexMatchTravelerGroup++) {
                                        var nodeMatchTravelerGroup = nsMatchTravelerGroups.GetItem(indexMatchTravelerGroup);

                                        var nsTravelers = nodeMatchTravelerGroup.Select("TravelerIDRef");
                                        if (nsTravelers)
                                            for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                                                var nodeTraveler = nsTravelers.GetItem(indexTraveler);

                                                if (nodeTravelerGroup.GetAttribute("TypeCount")) {
                                                    var typeCount = Number(nodeTravelerGroup.GetAttribute("TypeCount")) + 1;

                                                    // increments traveler count
                                                    nodeTravelerGroup.SetAttribute("TypeCount", typeCount.toString());
                                                    // increments total traveler amount
                                                    if (nodeTravelerGroup.SelectSingle("Price[@Total]")) {
                                                        var typeTotalPrice = Number(nodeTravelerGroup.SelectSingle("Price").GetAttribute("Total")) * typeCount;

                                                        nodeFareGroup.SetAttribute("TotalPrice", (Number(nodeFareGroup.GetAttribute("TotalPrice")) - Number(nodeTravelerGroup.GetAttribute("TypeTotalPrice")) - Number(nodeMatchTravelerGroup.SelectSingle("Price").GetAttribute("Total")) + typeTotalPrice).toString());
                                                        nodeTravelerGroup.SetAttribute("TypeTotalPrice", typeTotalPrice.toString());
                                                    }
                                                }

                                                // groups LoyaltyAccrual elements
                                                if (nodeMatchTravelerGroup.SelectSingle("FareRules/FareInfo/RelatedSegment/LoyaltyAccrual")) {
                                                    var nsLoyaltyAccrual = nodeMatchTravelerGroup.Select("FareRules/FareInfo/RelatedSegment/LoyaltyAccrual");
                                                    if(nsLoyaltyAccrual)
                                                        for (var indexLoyaltyAccrual = 0; indexLoyaltyAccrual < nsLoyaltyAccrual.Count; indexLoyaltyAccrual++) {
                                                            var nodeLoyaltyAccrual = nsLoyaltyAccrual.GetItem(indexLoyaltyAccrual);

                                                            nodeTravelerGroup.SelectSingle("FareRules/FareInfo/RelatedSegment[SegmentIDRef = \"" + nodeLoyaltyAccrual.Parent.ValueOfSelect("SegmentIDRef") + "\"]").AppendChild(nodeLoyaltyAccrual);
                                                        }
                                                }

                                                nodeTravelerGroup.SelectSingle("TravelerIDRef[last()]").InsertAfter(nodeTraveler);
                                            }
                                    }
                            }
                            else
                                nodeTravelerGroup.Delete();
                        }
                }
        }

        if (!this.isNDC) {
            // deletes non schema compliant attributes from OriginDestination element(s)
            var nsODs = domFareSearchRS.Root.Select("FareGroup/OriginDestination");
            if (nsODs)
                for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                    var nodeOD = nsODs.GetItem(indexOD);

                    nodeOD.RemoveAttribute("ODRef");
                    nodeOD.RemoveAttribute("rph");

                    var nsSegments = nodeOD.Select("Flight/Segment[@FlightRef]");
                    if (nsSegments)
                        for (var indexSegment = 0; indexSegment < nsSegments.Count; indexSegment++)
                            nsSegments.GetItem(indexSegment).RemoveAttribute("FlightRef");
                }

        }

        if (nodeFareGroup)
            this.StoreShoppingInCache({strCacheKey: this.GetShopppingCacheKey(), strFareSearchRS: domFareSearchRS.XML});

        this.BaseResponseValidation(domFareSearchRS);
    };

    /**
     * Validates and returns final shopping response
     * @param {xxDomDocument|string} fareSearchRS
     * @param {Boolean} native
     * @constructor
     */
    this.SetClientResponse = function(fareSearchRS, native) {

        if ((typeof native === 'undefined') || !native) {
            var domFareSearchRS = fareSearchRS;
            if (typeof(fareSearchRS) == "string") {
                domFareSearchRS = new xxDomDocument();
                domFareSearchRS.PreserveWhitespace = true;
                domFareSearchRS.LoadXML(fareSearchRS);
            }

            this.DCResponseValidation(domFareSearchRS);

            if (this.showLog) {
                this.getLog();

                domFareSearchRS.Root.SetAttribute("duration", this.logs[this.logs.length - 1].substring(this.logs[this.logs.length - 1].indexOf(":") + 1));
            }

            SetClientResponse(domFareSearchRS.XML);
        }
        else if (typeof(fareSearchRS) == "string") {
            var domFareSearchRS = new xxDomDocument();
            this.ResponseValidation(domFareSearchRS, fareSearchRS);

            SetClientResponse(domFareSearchRS.XML);
        }
    };

    /**
     * Performs calendar shopping call for the configured pricing provider
     * @returns {xxDomDocument}
     */
    this.ShopCalendar = function() {

        // gets DC availability
        if (!this.domRequest.Root.SelectSingle("AirAvailabilityRS"))
            this.GetAvailability();

        var arrFareSearchRQs = [];
        var domCalendarFareSearchRQ = new xxDomDocument();
        domCalendarFareSearchRQ.LoadXML(this.domRequest.XML);

        // adds number of alternates for lowest fare
        domCalendarFareSearchRQ.Root.SetAttribute("NumberOfAlternates", "1");

        // cleans calendar shopping request
        var nodeAirAvailabilityRS = domCalendarFareSearchRQ.Root.SelectSingle("AirAvailabilityRS");
        if (nodeAirAvailabilityRS)
            nodeAirAvailabilityRS.Delete();
        if (domCalendarFareSearchRQ.Root.SelectSingle("OptionalServices"))
            domCalendarFareSearchRQ.Root.SelectSingle("OptionalServices").Delete();

        var nsODS = domCalendarFareSearchRQ.Root.Select("OriginDestination");
        if (nsODS)
            for (var indexOD = 0; indexOD < nsODS.Count; indexOD++)
                nsODS.GetItem(indexOD).Delete();

        // builds calendar shopping request per Bound and CalendarDate
        var nsOriginDestinations = this.domRequest.Root.Select("OriginDestination");
        if (nsOriginDestinations) {
            for (var indexOriginDestinations = 0; indexOriginDestinations < nsOriginDestinations.Count; indexOriginDestinations++) {
                var nodeOriginDestination = nsOriginDestinations.GetItem(indexOriginDestinations);
                var strRPH = nodeOriginDestination.GetAttribute("rph");

                var nsDates = nodeOriginDestination.Select("Preferences/DayWindow/Date");
                if (nsDates) {
                    for (var indexDates = 0; indexDates < nsDates.Count; indexDates++) {
                        var nodeDate = nsDates.GetItem(indexDates);
                        var nodeODAvailability = this.domRequest.Root.SelectSingle("AirAvailabilityRS/OriginDestination[./Flight[1]/Segment[1]/Departure/Date = \"" + nodeDate.NormalizedText + "\" and ./@rph = '" + strRPH + "']");
                        if (nodeODAvailability) {
                            var domFareSearchRQ = new xxDomDocument();
                            domFareSearchRQ.LoadXML(domCalendarFareSearchRQ.Root.XML);

                            // adds or replaces current bound with calendar date
                            var nodeCalendarOD = nodeOriginDestination.Clone();
                            nodeCalendarOD.SelectSingle("Preferences/DayWindow").Delete();

                            domFareSearchRQ.Root.SelectSingle("PricingInfo").InsertBefore(nodeCalendarOD);
                            nodeCalendarOD.SelectSingle("Date").ReplaceText({domXML: domFareSearchRQ, strValue: nodeDate.NormalizedText});

                            arrFareSearchRQs.push(domFareSearchRQ.XML.AddXML("<AirAvailabilityRS>" + nodeODAvailability.XML + "</AirAvailabilityRS>"));
                        }
                    }
                }
            }
        }

        var domResponse = this.ShopAsync(arrFareSearchRQs, false);

        // flags calendar FareGroups
        var nsFareGroups = domResponse.Root.Select("FareGroup");
        if (nsFareGroups)
            for (var indexFareGroups = 0; indexFareGroups < nsFareGroups.Count; indexFareGroups++)
                nsFareGroups.GetItem(indexFareGroups).SetAttribute("RequestDateMatch", "N");

        // cleans main shopping request
        var nsDayWindows = this.domRequest.Root.Select("OriginDestination/Preferences/DayWindow");
        if (nsDayWindows)
            for (var indexDayWindows = 0; indexDayWindows < nsDayWindows.Count; indexDayWindows++)
                nsDayWindows.GetItem(indexDayWindows).Delete();

        var nsCalendarODs = this.domRequest.Root.Select("AirAvailabilityRS/OriginDestination[@matchDate = 'N']");
        if (nsCalendarODs)
            for (var indexCalendarODs = 0; indexCalendarODs < nsCalendarODs.Count; indexCalendarODs++)
                nsCalendarODs.GetItem(indexCalendarODs).Delete();

        if (this.domRequest.Root.SelectSingle("OptionalServices"))
            this.domRequest.Root.SelectSingle("OptionalServices").Delete();

        return domResponse;
    }

    /**
     * Performs shopping call for the configured pricing provider
     * @param {String} strFareSearchRQ
     * @param {Boolean} native
     * @returns {xxDomDocument}
     */
    this.Shop = function(strFareSearchRQ, native) {

        var native = ((typeof native === 'undefined') || !native)? false: true;
        var strFareSearchRS = this.GetCachedShopping(this.GetShopppingCacheKey());
        var domFareSearchRS = new xxDomDocument();

        if (strFareSearchRS)
            domFareSearchRS.LoadXML(strFareSearchRS);
        else {
            // calls configured provider
            var domFareSearchRS = null;
            if (this.provider && ("FLXP_VAYANT_TVP".indexOf(this.provider.providerName) > -1))
                domFareSearchRS = this.provider.Shop(this, native);
            else
                domFareSearchRS = this.serverSync.sendProvider({strXXServerRequest: strFareSearchRQ, nodeProvider: this.GetProvider(), native: false, logs: this.logs, endTransaction: true});

            // updates PaxPriced in request after shopping
            if (domFareSearchRS && domFareSearchRS.Root) {
                var nsTravelers = this.domRequest.SelectNodes(this.domRequest.Root, "TravelerIDs");
                if (nsTravelers) {
                    for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                        var nodeTravelerIDs = nsTravelers.GetItem(indexTraveler);

                        var strAssociationID = nodeTravelerIDs.GetAttribute("AssociationID");
                        var strPaxType = nodeTravelerIDs.GetAttribute("PaxType");
                        var strPaxPriced = nodeTravelerIDs.GetAttribute("PaxPriced");

                        // traveler direct association between request and response
                        var nodeTravelerGroup = domFareSearchRS.Root.SelectSingle("FareGroup/TravelerGroup[TravelerIDRef = \"" + strAssociationID + "\"]");
                        if (!nodeTravelerGroup) {
                            // traveler association between request and response by TypeRequested and TypePriced or TypeRequested
                            nodeTravelerGroup = domFareSearchRS.Root.SelectSingle("FareGroup/TravelerGroup[./@TypeRequested = \"" + strPaxType + "\" and ./@TypePriced = \"" + strPaxPriced + "\"]");
                            if (!nodeTravelerGroup)
                                nodeTravelerGroup = domFareSearchRS.Root.SelectSingle("FareGroup/TravelerGroup[./@TypeRequested = \"" + strPaxType + "\"]");
                        }

                        if (nodeTravelerGroup) {
                            nodeTravelerIDs.SetAttribute("PaxPriced", nodeTravelerGroup.GetAttribute("TypePriced"));
                            nodeTravelerIDs.SetAttribute("TGIndex", (nodeTravelerGroup.CountPrevSiblings() + 1).toString());
                        }
                    }
                }
            }
        }

        return domFareSearchRS;
    };

    /**
     * Performs asyncronic shopping call(s) for the configured pricing provider
     * @param {Array} arrFareSearchRQs
	 * @param {Boolean} native
     * @returns {xxDomDocument|String}
     */
    this.ShopAsync = function(arrFareSearchRQs, native) {

        var arrFareSearchRSs = [];

        // calls async configured provider
        if (this.provider && (this.provider.providerName == "FLXP"))
			arrFareSearchRSs = this.provider.ShopAsync(arrFareSearchRQs);
        else
            arrFareSearchRSs = this.serverAsync.sendProvider({arrXXServerRQs: arrFareSearchRQs, nodeProvider: this.GetProvider(), logs: this.logs, endTransaction: true});

        var domFareSearchRS;
        if ((typeof native === 'undefined') || !native) {
            // merge responses
            var validSolution = false;
            var indexAsyncFareSearchRS = 0;
            domFareSearchRS = new xxDomDocument();
            while (!validSolution && indexAsyncFareSearchRS < arrFareSearchRQs.length) {
                if (domFareSearchRS.LoadXML(arrFareSearchRSs[indexAsyncFareSearchRS]))
                    if (domFareSearchRS.Root.SelectSingle("FareGroup"))
                        validSolution = true;

                indexAsyncFareSearchRS++;
            }

            if (validSolution) {
                for (indexAsyncFareSearchRS; indexAsyncFareSearchRS < arrFareSearchRSs.length; indexAsyncFareSearchRS++) {
                    var strAsyncFareSearchRS = arrFareSearchRSs[indexAsyncFareSearchRS];

                    var domAsyncFareSearchRS = new xxDomDocument();
                    if (domAsyncFareSearchRS.LoadXML(strAsyncFareSearchRS)) {
                        if (domAsyncFareSearchRS.Root.SelectSingle("InfoGroup[ForInfo]") && domAsyncFareSearchRS.Root.SelectSingle("FareGroup")) {
                            if (domFareSearchRS.Root.SelectSingle("InfoGroup")) {
                                var nsForInfos = domAsyncFareSearchRS.SelectNodes(domAsyncFareSearchRS.Root, "InfoGroup/ForInfo")
                                for (var indexForInfo = 0; indexForInfo < nsForInfos.Count; indexForInfo++)
                                    domFareSearchRS.Root.SelectSingle("InfoGroup").AppendChild(nsForInfos.GetItem(indexForInfo));
                            }
                            else
                                domFareSearchRS.Root.FirstChild.InsertBefore(domAsyncFareSearchRS.Root.SelectSingle("InfoGroup").Clone());
                        }

                        var nsFareGroups = domAsyncFareSearchRS.Root.Select("FareGroup")
                        if (nsFareGroups)
                            domFareSearchRS.Root.AppendChildren(nsFareGroups);
                    }
                }

                // flags overlapping FareGroups
                if (domFareSearchRS.Root.SelectSingle("FareGroup") && (this.domRequest.Root.GetAttribute("BrandedFareSupport") == "Y")) {
                    var nsOverlappingFareGroups = domFareSearchRS.Root.Select("FareGroup[TravelerGroup/FareRules/FareInfo[RelatedSegment[@ODRef]]]");
                    if (nsOverlappingFareGroups) {
                        for (var indexOverlappingFareGroups = 0; indexOverlappingFareGroups < nsOverlappingFareGroups.Count; indexOverlappingFareGroups++) {
                            var nodeOverlappingFareGroup = nsOverlappingFareGroups.GetItem(indexOverlappingFareGroups);

                            var nsOverlappingFareInfos = nodeOverlappingFareGroup.Select("TravelerGroup/FareRules/FareInfo[RelatedSegment[@ODRef]]");
                            if (nsOverlappingFareInfos) {
                                fareInfo_loop:
                                for (var indexOverlappingFareInfos = 0; indexOverlappingFareInfos < nsOverlappingFareInfos.Count; indexOverlappingFareInfos++) {
                                    var nodeOverlappingFareInfo = nsOverlappingFareInfos.GetItem(indexOverlappingFareInfos);
                                    var nodeFirstRelatedSegment = nodeOverlappingFareInfo.SelectSingle("RelatedSegment[position() = 1]");
                                    if (nodeOverlappingFareInfo.SelectSingle("RelatedSegment[not(@ODRef = '" + nodeFirstRelatedSegment.GetAttribute("ODRef") + "')]")) {
                                        nodeOverlappingFareGroup.SetAttribute("overlapped", "Y");
                                        break fareInfo_loop;
                                    }
                                }
                            }
                        }
                    }
                }

                // removes overlapping FareGroups if there is at least 1 non overlapping FareGroup
                if (domFareSearchRS.Root.Select("FareGroup[not(@overlapped = 'Y')]")) {
                    var nsOverlappingFareGroups = domFareSearchRS.Root.Select("FareGroup[@overlapped = 'Y']");
                    if (nsOverlappingFareGroups && domFareSearchRS.Root.Select("FareGroup[not(@overlapped = 'Y')]"))
                        for (var indexOverlappingFareGroups = 0; indexOverlappingFareGroups < nsOverlappingFareGroups.Count; indexOverlappingFareGroups++)
                            nsOverlappingFareGroups.GetItem(indexOverlappingFareGroups).Delete();
                }

                // updates PaxPriced in request after shopping
                var nsTravelers = this.domRequest.SelectNodes(this.domRequest.Root, "TravelerIDs");
                if (nsTravelers) {
                    for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                        var nodeTravelerIDs = nsTravelers.GetItem(indexTraveler);

                        var strAssociationID = nodeTravelerIDs.GetAttribute("AssociationID");
                        var strPaxType = nodeTravelerIDs.GetAttribute("PaxType");
                        var strPaxPriced = nodeTravelerIDs.GetAttribute("PaxPriced");

                        // traveler direct association between request and response
                        var nodeTravelerGroup = domFareSearchRS.Root.SelectSingle("FareGroup/TravelerGroup[TravelerIDRef = \"" + strAssociationID + "\"]");
                        if (!nodeTravelerGroup) {
                            // traveler association between request and response by TypeRequested and TypePriced or TypeRequested
                            nodeTravelerGroup = domFareSearchRS.Root.SelectSingle("FareGroup/TravelerGroup[./@TypeRequested = \"" + strPaxType + "\" and ./@TypePriced = \"" + strPaxPriced + "\"]");
                            if (!nodeTravelerGroup)
                                nodeTravelerGroup = domFareSearchRS.Root.SelectSingle("FareGroup/TravelerGroup[./@TypeRequested = \"" + strPaxType + "\"]");
                        }

                        if (nodeTravelerGroup) {
                            nodeTravelerIDs.SetAttribute("PaxPriced", nodeTravelerGroup.GetAttribute("TypePriced"));
                            nodeTravelerIDs.SetAttribute("TGIndex", (nodeTravelerGroup.CountPrevSiblings() + 1).toString());
                        }
                    }
                }
            }
            else {
                indexAsyncFareSearchRS = 0;
                while (indexAsyncFareSearchRS < arrFareSearchRQs.length) {
                    if (domFareSearchRS.LoadXML(arrFareSearchRSs[indexAsyncFareSearchRS]))
                        if (domFareSearchRS.Root.SelectSingle("InfoGroup"))
                            throw "DC#" + domFareSearchRS.Root.SelectSingle("InfoGroup").XML;

                    indexAsyncFareSearchRS++;
                }

                throw "180000105";
            }
        }
        else {
            domFareSearchRS = "<MultiFareSearchRS>";
            for (var indexFareSearchRS = 0; indexFareSearchRS < arrFareSearchRSs.length; indexFareSearchRS++)
                domFareSearchRS += arrFareSearchRSs[indexFareSearchRS];

            domFareSearchRS += "</MultiFareSearchRS>";
        }

        return domFareSearchRS;
    };


    /**
     * Performs shopping calls for the configured pricing provider
     * @param {Boolean} native
     * @returns {xxDomDocument|String}
     */
    this.ShopByBrands = function(native) {

        var strFareSearchRS = this.GetCachedShopping(this.GetShopppingCacheKey());
        var domFareSearchRS = new xxDomDocument();

        if (strFareSearchRS) {
            if (native)
                domFareSearchRS = strFareSearchRS;
            else
                domFareSearchRS.LoadXML(strFareSearchRS);
        }
        else {
            // gets DC availablity
            if (!this.domRequest.Root.SelectSingle("AirAvailabilityRS"))
                this.GetAvailability();

            var nodeAvailabilityRS = this.domRequest.Root.SelectSingle("AirAvailabilityRS");
            nodeAvailabilityRS.Remove();

            if (this.brands.length == 0)
                throw "180000103";

            var arrFareSearchRQs = [];
            for (var indexBrands = 0; indexBrands < this.brands.length; indexBrands++) {
                var nodeBrand = this.brands[indexBrands];

                // constructs single bound request with availability
                var domFareSearchRQByBrand = new xxDomDocument();
                domFareSearchRQByBrand.LoadXML(this.domRequest.XML);

                var nodeAvailabilityRSByBrand = nodeAvailabilityRS.Clone();

                var nsODs = nodeAvailabilityRSByBrand.Select("OriginDestination");
                if (nsODs)
                    for (var indexOD = (nsODs.Count - 1); indexOD >= 0; indexOD--) {
                        var nodeOD = nsODs.GetItem(indexOD);

                        var nsFlights = nodeOD.Select("Flight");
                        if (nsFlights) {
                            for (var indexFlight = (nsFlights.Count - 1); indexFlight >= 0; indexFlight--) {
                                var nodeFlight = nsFlights.GetItem(indexFlight);

                                var nsSegments = nodeFlight.Select("Segment");
                                if (nsSegments) {
                                    for (var indexSegment = (nsSegments.Count - 1); indexSegment >= 0; indexSegment--) {
                                        var nodeSegment = nsSegments.GetItem(indexSegment);

                                        // adds PriceClass
                                        nodeSegment.SetAttribute("PriceClass", nodeBrand.brandName);
                                        nodeSegment.SetAttribute("Code", nodeBrand.brandCode);

                                        var nsClasses = nodeSegment.Select("Classes/ClassOfService");
                                        if (nsClasses) {
                                            var nodeClasses = nodeSegment.SelectSingle("Classes").Clone();
                                            if (nodeBrand.brandFilter == "rbd") var nodeAllClasses = domFareSearchRQByBrand.PutNode(nodeSegment, "AllClasses");
                                            for (var indexClassOfService = (nsClasses.Count - 1); indexClassOfService >= 0; indexClassOfService--) {
                                                var nodeClassOfService = nsClasses.GetItem(indexClassOfService);
                                                if (nodeBrand.brandFilter == "rbd") nodeAllClasses.AppendChild(nodeClassOfService.Clone());

                                                if ((nodeBrand.brandFilter == "rbd") && nodeBrand.rbds.indexOf(nodeClassOfService.NormalizedText) == -1)
                                                    nodeClassOfService.Delete();
                                            }

                                            // adds the full availability if no availability is returned for this segment
                                            if (!nodeSegment.SelectSingle("Classes/ClassOfService")) {
                                                nodeSegment.SelectSingle("Classes").Delete();
                                                nodeSegment.AppendChild(nodeClasses);
                                                nodeSegment.SetAttribute("fullInventory", "Y");
                                            }
                                        }
                                        else {
                                            nodeFlight.Delete();

                                            indexSegment = -1;
                                        }
                                    }

                                    // drops the flight if any of the segments doesn't have at least 1 valid ClassOfService.
                                    if (nodeFlight.SelectSingle("Segment/Classes[not(ClassOfService[translate(@Status, translate(ClassOfService/@Status, '0123456789', ''), '') > 0)]]"))
                                        nodeFlight.Delete();
                                }
                                else
                                    nodeFlight.Delete();
                            }
                        }

                        if (!nodeOD.SelectSingle("Flight"))
                            nodeOD.Delete();
                    }

                // adds the FBC wildcard
                if (nodeBrand.fbcs.length > 0) {
                    var nodeFareSelection = domFareSearchRQByBrand.PutNode(domFareSearchRQByBrand.Root.SelectSingle("PricingInfo"), "FareSelection");
                    for (var indexFareBasisCode = 0; indexFareBasisCode < nodeBrand.fbcs.length; indexFareBasisCode++) {
                        var nodeFareBasisCode = domFareSearchRQByBrand.CreateElementNode("FareBasisCode");
                        var nodeFareBasisCodeText = domFareSearchRQByBrand.CreateTextNode(nodeBrand.fbcs[indexFareBasisCode]);
                        nodeFareBasisCode.AppendChild(nodeFareBasisCodeText);
                        nodeFareSelection.AppendChild(nodeFareBasisCode);
                    }
                }

                // adds the FareType wildcard
                if (nodeBrand.fareTypes.length > 0) {
                    var nodeFareSelection = domFareSearchRQByBrand.Root.SelectSingle("PricingInfo/FareSelection");
                    if (!nodeFareSelection)
                        nodeFareSelection = domFareSearchRQByBrand.PutNode(domFareSearchRQByBrand.Root.SelectSingle("PricingInfo"), "FareSelection");

                    for (var indexFareType = 0; indexFareType < nodeBrand.fareTypes.length; indexFareType++) {
                        var nodeFareType = domFareSearchRQByBrand.CreateElementNode("FareType");
                        var nodeFareTypeText = domFareSearchRQByBrand.CreateTextNode(nodeBrand.fareTypes[indexFareType]);
                        nodeFareType.AppendChild(nodeFareTypeText);
                        nodeFareSelection.AppendChild(nodeFareType);
                    }
                }

                // drops the brand call if there isn't at least 1 segment with the corresponding RBDs for this brand
                if (nodeBrand.brandFilter == "rbd") {
                    if (!nodeAvailabilityRSByBrand.SelectSingle("OriginDestination[Flight/Segment[not(@fullInventory = 'Y')]]"))
                        continue;
                    else {
                        var nsODs = nodeAvailabilityRSByBrand.Select("OriginDestination[Flight/Segment[not(@fullInventory = 'Y')]]");
                        if (nsODs) {
                            for (var indexOD = (nsODs.Count - 1); indexOD >= 0; indexOD--) {
                                var nsFlights = nsODs.GetItem(indexOD).Select("Flight[not(Segment[not(@fullInventory = 'Y')])]");
                                if (nsFlights)
                                    for (var indexFlight = 0; indexFlight < nsFlights.Count; indexFlight++)
                                        nsFlights.GetItem(indexFlight).Delete();

                                if (!nsODs.GetItem(indexOD).SelectSingle("Flight"))
                                    nsODs.GetItem(indexOD).Delete();
                            }
                        }
                    }
                }

                // sets transactionId per request
                domFareSearchRQByBrand.Root.SetAttribute("TransactionIdentifier", CreateCARF());

                if (nodeAvailabilityRSByBrand.Select("OriginDestination") && (nodeAvailabilityRSByBrand.Select("OriginDestination").Count == domFareSearchRQByBrand.Root.Select("OriginDestination").Count)) {
                    domFareSearchRQByBrand.Root.AppendChild(nodeAvailabilityRSByBrand);

                    arrFareSearchRQs.push(domFareSearchRQByBrand.XML);
                }
            }

            if (arrFareSearchRQs.length < 1)
                throw "200003022#No Inventory Available. Please check the Availability Options.";

            domFareSearchRS = this.ShopAsync(arrFareSearchRQs, native);

            // flags solutions with brands info
            if (domFareSearchRS && ((typeof native === 'undefined') || !native)) {
                var nsFareBasisCodes = domFareSearchRS.Root.Select("FareGroup/TravelerGroup/FareRules/FareInfo/FareBasisCode");
                if (nsFareBasisCodes)
                    for (var indexFareBasisCode = 0; indexFareBasisCode < nsFareBasisCodes.Count; indexFareBasisCode++) {
                        var nodeFareBasisCode = nsFareBasisCodes.GetItem(indexFareBasisCode);

                        var nodeSegmentIDRef = nodeFareBasisCode.Parent.SelectSingle("RelatedSegment/SegmentIDRef");
                        if (nodeSegmentIDRef && nodeSegmentIDRef.GetAttribute("FlightRefKey")) {
                            var nodeSegment = nodeFareBasisCode.Parent.Parent.Parent.Parent.SelectSingle("OriginDestination/Flight/Segment[@FlightRefKey = \"" + nodeSegmentIDRef.GetAttribute("FlightRefKey") + "\"]");
                            if (nodeSegment) {
                                if (nodeSegment.GetAttribute("PriceClass"))
                                    nodeFareBasisCode.SetAttribute("PriceClass", nodeSegment.GetAttribute("PriceClass"));
                                if (nodeSegment.GetAttribute("Code"))
                                    nodeFareBasisCode.SetAttribute("Code", nodeSegment.GetAttribute("Code"));
                            }
                        }

                        var nsRelatedSegments = nodeFareBasisCode.Parent.Select("RelatedSegment/SegmentIDRef");
                        if (nsRelatedSegments)
                            for (var indexRelatedSegments = 0; indexRelatedSegments < nsRelatedSegments.Count; indexRelatedSegments++) {
                                var nodeSegment = nodeFareBasisCode.Parent.Parent.Parent.Parent.SelectSingle("OriginDestination/Flight/Segment[@FlightRefKey = \"" + nsRelatedSegments.GetItem(indexRelatedSegments).GetAttribute("FlightRefKey") + "\"]");
                                if (nodeSegment && nodeSegment.SelectSingle("Classes/ClassOfService"))
                                    nodeSegment.SelectSingle("Classes/ClassOfService").SetAttribute("FareBasisCode", nodeFareBasisCode.NormalizedText);
                            }
                    }
            }
        }

        return domFareSearchRS;
    };

    /**
     * Performs shopping calls per bound for the configured pricing provider
     * @param {Boolean} native
     * @returns {xxDomDocument|String}
     */
    this.ShopByBrandsPerBound = function(native) {

        var strFareSearchRS = this.GetCachedShopping(this.GetShopppingCacheKey());
        var domFareSearchRS = new xxDomDocument();

        if (strFareSearchRS) {
            if (native)
                domFareSearchRS = strFareSearchRS;
            else
                domFareSearchRS.LoadXML(strFareSearchRS);
        }
        else {
            // gets DC availablity
            if (!this.domRequest.Root.SelectSingle("AirAvailabilityRS"))
                this.GetAvailability();

            var nodeAvailabilityRS = this.domRequest.Root.SelectSingle("AirAvailabilityRS");
            nodeAvailabilityRS.Remove();

            if (this.brands.length == 0)
                throw "180000103";

            // per bound
            var nsODs = this.domRequest.Root.Select("OriginDestination");
            if (nsODs) {
                var arrFareSearchRQs = [];
                for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                    for (var indexBrands = 0; indexBrands < this.brands.length; indexBrands++) {
                        var nodeBrand = this.brands[indexBrands];
                        var nodeOD = nsODs.GetItem(indexOD).Clone();
                        var nodeODAvailability = nodeAvailabilityRS.Select("OriginDestination").GetItem(indexOD).Clone();

                        // constructs single bound request with availablity
                        var domFareSearchRQByBrand = new xxDomDocument();
                        domFareSearchRQByBrand.LoadXML(this.domRequest.XML);

                        if (this.domRequest.Root.GetAttribute("Domestic") == "Y") {
                            domFareSearchRQByBrand.Root.DeleteChildren("OriginDestination");
                            if (domFareSearchRQByBrand.Root.SelectSingle("PricingInfo"))
                                domFareSearchRQByBrand.Root.SelectSingle("PricingInfo").InsertBefore(nodeOD);
                            else
                                domFareSearchRQByBrand.Root.AppendChild(nodeOD);
                        }

                        var nodeAvailabilityRSByBrand = domFareSearchRQByBrand.CreateElementNode("AirAvailabilityRS");

                        // collects only first Inbound flight for Outbound calls and viceversa for RT scenarios
                        if ((this.domRequest.Root.GetAttribute("Domestic") != "Y") && (nsODs.Count == 2)) {
                            if (indexOD == 0) {
                                var nodeIBAvailabilityOD = nodeAvailabilityRS.SelectSingle("OriginDestination[last()]").Clone();
                                var nodeSelectedFlight = nodeIBAvailabilityOD.SelectSingle("Flight[@rbdAmount = '" + nodeIBAvailabilityOD.GetAttribute("highestRBDAmount") + "']");
                                nodeSelectedFlight.Remove();
                                var nsFlightsToDelete = nodeIBAvailabilityOD.Select("Flight");
                                if (nodeSelectedFlight && nsFlightsToDelete) {
                                    for (var indexFlightsToDelete = 0; indexFlightsToDelete < nsFlightsToDelete.Count; indexFlightsToDelete++)
                                        nsFlightsToDelete.GetItem(indexFlightsToDelete).Delete();

                                    nodeIBAvailabilityOD.AppendChild(nodeSelectedFlight);
                                }

                                nodeAvailabilityRSByBrand.AppendChild(nodeODAvailability);
                                nodeAvailabilityRSByBrand.AppendChild(nodeIBAvailabilityOD);
                            }
                            else {
                                var nodeOBAvailabilityOD = nodeAvailabilityRS.SelectSingle("OriginDestination[1]").Clone();
                                var nodeSelectedFlight = nodeOBAvailabilityOD.SelectSingle("Flight[@rbdAmount = '" + nodeOBAvailabilityOD.GetAttribute("highestRBDAmount") + "']");
                                nodeSelectedFlight.Remove();
                                var nsFlightsToDelete = nodeOBAvailabilityOD.Select("Flight");
                                if (nodeSelectedFlight && nsFlightsToDelete) {
                                    for (var indexFlightsToDelete = 0; indexFlightsToDelete < nsFlightsToDelete.Count; indexFlightsToDelete++)
                                        nsFlightsToDelete.GetItem(indexFlightsToDelete).Delete();

                                    nodeOBAvailabilityOD.AppendChild(nodeSelectedFlight);
                                }

                                nodeAvailabilityRSByBrand.AppendChild(nodeOBAvailabilityOD);
                                nodeAvailabilityRSByBrand.AppendChild(nodeODAvailability);
                            }
                        }

                        if (!nodeAvailabilityRSByBrand.FirstChild)
                            nodeAvailabilityRSByBrand.AppendChild(nodeODAvailability);

                        var nsFlights = nodeODAvailability.Select("Flight");
                        if (nsFlights)
                            for (var indexFlight = (nsFlights.Count - 1); indexFlight >= 0; indexFlight--) {
                                var nodeFlight = nsFlights.GetItem(indexFlight);

                                var nsSegments = nodeFlight.Select("Segment");
                                if (nsSegments) {
                                    for (var indexSegment = (nsSegments.Count - 1); indexSegment >= 0; indexSegment--) {
                                        var nodeSegment = nsSegments.GetItem(indexSegment);

                                        // adds PriceClass
                                        nodeSegment.SetAttribute("PriceClass", nodeBrand.brandName);
                                        nodeSegment.SetAttribute("Code", nodeBrand.brandCode);

                                        var nsClasses = nodeSegment.Select("Classes/ClassOfService");
                                        if (nsClasses) {
                                            var nodeClasses = nodeSegment.SelectSingle("Classes").Clone();
                                            if (nodeBrand.brandFilter == "rbd") var nodeAllClasses = domFareSearchRQByBrand.PutNode(nodeSegment, "AllClasses");
                                            for (var indexClassOfService = (nsClasses.Count - 1); indexClassOfService >= 0; indexClassOfService--) {
                                                var nodeClassOfService = nsClasses.GetItem(indexClassOfService);
                                                if (nodeBrand.brandFilter == "rbd") nodeAllClasses.AppendChild(nodeClassOfService.Clone());

                                                if ((Number(nodeClassOfService.GetAttribute("Status")).toString() == "NaN") || (Number(nodeClassOfService.GetAttribute("Status")) < 1)) {
                                                    nodeClassOfService.Delete();
                                                    continue;
                                                }

                                                if ((nodeBrand.brandFilter == "rbd") && nodeBrand.rbds.indexOf(nodeClassOfService.NormalizedText) == -1)
                                                    nodeClassOfService.Delete();
                                            }
                                            // adds the full availability if no availability is returned for this segment
                                            if (!nodeSegment.SelectSingle("Classes/ClassOfService")) {
                                                nodeSegment.SelectSingle("Classes").Delete();
                                                nodeSegment.AppendChild(nodeClasses);
                                                nodeSegment.SetAttribute("fullInventory", "Y");
                                            }
                                        }
                                        else {
                                            nodeFlight.Delete();

                                            indexSegment = -1;
                                        }
                                    }

                                    // drops the flight if any of the segments doesn't have at least 1 valid ClassOfService.
                                    if (nodeFlight.SelectSingle("Segment/Classes[not(ClassOfService[translate(@Status, translate(ClassOfService/@Status, '0123456789', ''), '') > 0)]]"))
                                        nodeFlight.Delete();
                                }
                                else
                                    nodeFlight.Delete();
                            }

                        // adds the FBC wildcard
                        if (nodeBrand.fbcs.length > 0) {
                            var nodeFareSelection = domFareSearchRQByBrand.PutNode(domFareSearchRQByBrand.Root.SelectSingle("PricingInfo"), "FareSelection");
                            for (var indexFareBasisCode = 0; indexFareBasisCode < nodeBrand.fbcs.length; indexFareBasisCode++) {
                                var nodeFareBasisCode = domFareSearchRQByBrand.CreateElementNode("FareBasisCode");
                                var nodeFareBasisCodeText = domFareSearchRQByBrand.CreateTextNode(nodeBrand.fbcs[indexFareBasisCode]);
                                nodeFareBasisCode.AppendChild(nodeFareBasisCodeText);
                                nodeFareSelection.AppendChild(nodeFareBasisCode);
                            }
                        }

                        // adds the FareType wildcard
                        if (nodeBrand.fareTypes.length > 0) {
                            var nodeFareSelection = domFareSearchRQByBrand.Root.SelectSingle("PricingInfo/FareSelection");
                            if (!nodeFareSelection)
                                nodeFareSelection = domFareSearchRQByBrand.PutNode(domFareSearchRQByBrand.Root.SelectSingle("PricingInfo"), "FareSelection");

                            for (var indexFareType = 0; indexFareType < nodeBrand.fareTypes.length; indexFareType++) {
                                var nodeFareType = domFareSearchRQByBrand.CreateElementNode("FareType");
                                var nodeFareTypeText = domFareSearchRQByBrand.CreateTextNode(nodeBrand.fareTypes[indexFareType]);
                                nodeFareType.AppendChild(nodeFareTypeText);
                                nodeFareSelection.AppendChild(nodeFareType);
                            }
                        }

                        // drops the brand call if there isn't at least 1 segment with the corresponding RBDs for this brand
                        if (nodeBrand.brandFilter == "rbd") {
                            if (!nodeAvailabilityRSByBrand.SelectSingle("OriginDestination/Flight[Segment[not(@fullInventory = 'Y')]]"))
                                continue;
                            else {
                                var nsFlightToFilter = nodeAvailabilityRSByBrand.Select("OriginDestination/Flight[Segment[not(@fullInventory = 'Y')]]");
                                if (nsFlightToFilter) {
                                    for (var indexFlightsToFilter = (nsFlightToFilter.Count - 1); indexFlightsToFilter >= 0; indexFlightsToFilter--)
                                        nsFlightToFilter.GetItem(indexFlightsToFilter).Delete();
                                }
                            }
                        }

                        if (nodeODAvailability.SelectSingle("Flight")) {
                            domFareSearchRQByBrand.Root.AppendChild(nodeAvailabilityRSByBrand);

                            // adds PriceClass
                            var nsSegmentsWithNOPriceClass = nodeAvailabilityRSByBrand.Select("OriginDestination/Flight/Segment[not(@PriceClass)]");
                            var nodeSegmentWithPriceClass = nodeAvailabilityRSByBrand.SelectSingle("OriginDestination/Flight/Segment[@PriceClass]");
                            if (nodeSegmentWithPriceClass && nsSegmentsWithNOPriceClass) {
                                for (var indexSegmentsWithNOPriceClass = 0; indexSegmentsWithNOPriceClass < nsSegmentsWithNOPriceClass.Count; indexSegmentsWithNOPriceClass++) {
                                    nsSegmentsWithNOPriceClass.GetItem(indexSegmentsWithNOPriceClass).SetAttribute("PriceClass", nodeSegmentWithPriceClass.GetAttribute("PriceClass"));
                                    nsSegmentsWithNOPriceClass.GetItem(indexSegmentsWithNOPriceClass).SetAttribute("Code", nodeSegmentWithPriceClass.GetAttribute("Code"));
                                }
                            }

                            arrFareSearchRQs.push(domFareSearchRQByBrand.XML);
                        }
                    }
                }

                if (arrFareSearchRQs.length < 1)
                    throw "200003022#No Inventory Available. Please check the Availability Options.";

                domFareSearchRS = this.ShopAsync(arrFareSearchRQs, native);

                // flags solutions with brands info
                if (domFareSearchRS && ((typeof native === 'undefined') || !native)) {
                    var nsFareBasisCodes = domFareSearchRS.Root.Select("FareGroup/TravelerGroup/FareRules/FareInfo/FareBasisCode");
                    if (nsFareBasisCodes)
                        for (var indexFareBasisCode = 0; indexFareBasisCode < nsFareBasisCodes.Count; indexFareBasisCode++) {
                            var nodeFareBasisCode = nsFareBasisCodes.GetItem(indexFareBasisCode);

                            var nodeSegmentIDRef = nodeFareBasisCode.Parent.SelectSingle("RelatedSegment/SegmentIDRef");
                            if (nodeSegmentIDRef && nodeSegmentIDRef.GetAttribute("FlightRefKey")) {
                                var nodeSegment = nodeFareBasisCode.Parent.Parent.Parent.Parent.SelectSingle("OriginDestination/Flight/Segment[@FlightRefKey = \"" + nodeSegmentIDRef.GetAttribute("FlightRefKey") + "\"]");
                                if (nodeSegment) {
                                    if (nodeSegment.GetAttribute("PriceClass"))
                                        nodeFareBasisCode.SetAttribute("PriceClass", nodeSegment.GetAttribute("PriceClass"));
                                    if (nodeSegment.GetAttribute("Code"))
                                        nodeFareBasisCode.SetAttribute("Code", nodeSegment.GetAttribute("Code"));
                                }
                            }

                            var nsRelatedSegments = nodeFareBasisCode.Parent.Select("RelatedSegment/SegmentIDRef");
                            if (nsRelatedSegments)
                                for (var indexRelatedSegments = 0; indexRelatedSegments < nsRelatedSegments.Count; indexRelatedSegments++) {
                                    var nodeSegment = nodeFareBasisCode.Parent.Parent.Parent.Parent.SelectSingle("OriginDestination/Flight/Segment[@FlightRefKey = \"" + nsRelatedSegments.GetItem(indexRelatedSegments).GetAttribute("FlightRefKey") + "\"]");
                                    if (nodeSegment && nodeSegment.SelectSingle("Classes/ClassOfService"))
                                        nodeSegment.SelectSingle("Classes/ClassOfService").SetAttribute("FareBasisCode", nodeFareBasisCode.NormalizedText);
                                }
                        }
                }
            }
        }

        // adds price per bound
        var odSET = domFareSearchRS.Root.Select("FareGroup/OriginDestination[@ODRef]");
        if (odSET) {
            var odCOUNT = odSET.Count;
            for (var odPOS = 0; odPOS < odCOUNT; odPOS++) {
                var odNODE = odSET.GetItem(odPOS);

                var fcSET = odNODE.Parent.Select("TravelerGroup/FareRules/FareInfo[RelatedSegment[@ODRef = '" + odNODE.GetAttribute("ODRef") + "']]/FareComponent");
                if (fcSET) {
                    var fcCOUNT = fcSET.Count;
                    var fcTotal = 0;
                    for (var fcPOS = 0; fcPOS < fcCOUNT; fcPOS++)
                        fcTotal += Number(fcSET.GetItem(fcPOS).GetAttribute("Total"));

                    odNODE.SetAttribute("odPrice", fcTotal.toString());
                }
            }
        }

        // updates string XML request
        this.requestXML = this.domRequest.XML;

        return domFareSearchRS;
    };

    /**
     * Gets FLXM shopping rules (discounts, taxes, etc)
     * @param {{domFareSearchRS: xxDomDocument, strFLXMEnvironment: String, boundBased: Boolean}} parameters
     * @returns {xxDomDocument}
     */
    this.GetFLXMShoppingRules = function(parameters) {

        try {

            // checks if the FLX-M request is bound based to remove bounds not to be processed
            if (!(typeof parameters.boundBased === 'undefined') && parameters.boundBased == true) {
                var domRequest = new xxDomDocument();
                domRequest.LoadXML(this.requestXML);
                var nsODS = domRequest.Root.Select("OriginDestination[not(@ODRef = \"" + parameters.domFareSearchRS.Root.SelectSingle("FareGroup/OriginDestination").GetAttribute("ODRef") + "\")]");
                if (nsODS)
                    for (var indexOD = 0; indexOD < nsODS.Count; indexOD++)
                        nsODS.GetItem(indexOD).Delete();
            }

            // builds FLX-M request
            var strAlterFareSearchRQ = "<AlterFareSearchRQ/>";
            strAlterFareSearchRQ = strAlterFareSearchRQ.AddXML(parameters.domFareSearchRS.XML);
            strAlterFareSearchRQ = strAlterFareSearchRQ.AddXML((!(typeof parameters.boundBased === 'undefined') && (parameters.boundBased == true))? domRequest.XML: this.requestXML);

            var domFLXMTC = BuildFLXMTC({domTC: this.domTC, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: parameters.strFLXMEnvironment});
            domFLXMTC.Root.SelectSingle("provider").SetAttribute("fc", "standard");
            var providerFLXM = new JsXXServer(domFLXMTC);

            var domFareSearchRS = providerFLXM.SendTransaction({strXXServerRequest: strAlterFareSearchRQ, endTransaction: true});
            if (!providerFLXM.IsFLXMValidErrorResponse() && !providerFLXM.IsErrorResponse()) {
                // adds @SourceFare attribute back to the FareInfo/FareBasisCode
                if (parameters.domFareSearchRS.Root.Select("FareGroup/TravelerGroup/FareRules/FareInfo/FareBasisCode[@SourceFare]")) {
                    var nsTravelerGroups = parameters.domFareSearchRS.Root.Select("FareGroup/TravelerGroup[FareRules/FareInfo/FareBasisCode[@SourceFare]]");
                    if (nsTravelerGroups) {
                        for (var indexTravelerGroups = 0; indexTravelerGroups < nsTravelerGroups.Count; indexTravelerGroups++) {
                            var nodeTravelerGroup = nsTravelerGroups.GetItem(indexTravelerGroups);
                            var strTravelerIDRef = nodeTravelerGroup.SelectSingle("TravelerIDRef").NormalizedText;

                            var nsResponseTravelerGroups = domFareSearchRS.Root.Select("FareGroup/TravelerGroup[TravelerIDRef = '" + strTravelerIDRef + "' and not(FareRules/FareInfo/FareBasisCode[@SourceFare])]");
                            if (nsResponseTravelerGroups) {
                                for (var indexResponseTravelerGroups = 0; indexResponseTravelerGroups < nsResponseTravelerGroups.Count; indexResponseTravelerGroups++) {
                                    var nsFareInfos = nodeTravelerGroup.Select("FareRules/FareInfo");
                                    if (nsFareInfos) {
                                        var nsResponseFareInfos = nsResponseTravelerGroups.GetItem(indexResponseTravelerGroups).Select("FareRules/FareInfo");
                                        for (var indexFareInfos = 0; indexFareInfos < nsFareInfos.Count; indexFareInfos++) {
                                            var nodeFareBasisCode = nsFareInfos.GetItem(indexFareInfos).SelectSingle("FareBasisCode");
                                            if (nodeFareBasisCode.GetAttribute("SourceFare"))
                                                nsResponseFareInfos.GetItem(indexFareInfos).SelectSingle("FareBasisCode").SetAttribute("SourceFare", nodeFareBasisCode.GetAttribute("SourceFare"));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                return domFareSearchRS;
            }
            else {
                TraceText(__file__, "Merchandising rules were not applied successfully", providerFLXM.LastError());
                if (!parameters.domFareSearchRS.Root.Select("FareGroup/TravelerGroup/Price/Taxes[not(@Amount = 0)]"))
                    throw "180000053";

                return parameters.domFareSearchRS;
            }
        }
        catch (error) {
            TraceText(__file__, "Merchandising rules were not applied successfully", error.toString());
            if (!parameters.domFareSearchRS.Root.Select("FareGroup/TravelerGroup/Price/Taxes[not(@Amount = 0)]"))
                throw "180000053";

            return parameters.domFareSearchRS;
        }
    };

    /**
     * Calls FLX-M for merchandising rules
     * @param {String} serviceSearchXML
     * @returns {String}
     */
    this.GetMerchandisingRules = function(serviceSearchXML) {

        try {
            // calls FLX-M for merchandising rules
            return (this.serverSync.sendFLXM({strXXServerRequest: serviceSearchXML, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: "flxm", native: true, logs: this.logs, endTransaction: true}));
        }
        catch (error) {
            if (this.showTrace) TraceText(__file__, "* No services found", error.toString());
        }
    };

    /**
     * Builds cache availability cache key
     * @returns {String}
     */
    this.GetAvailabilityCacheKey = function() {

        var strAvailabilityCacheKey = "";

        var nsODs = this.domRequest.SelectNodes(this.domRequest.Root, "OriginDestination");
        if(nsODs) {
            for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                var nodeOD = nsODs.GetItem(indexOD);

                strAvailabilityCacheKey += this.airlineId + ":";
                strAvailabilityCacheKey += this.pcc + ":";
                strAvailabilityCacheKey += nodeOD.SelectSingle("Departure/CityCode").NormalizedText + ":";
                strAvailabilityCacheKey += nodeOD.SelectSingle("Date").NormalizedText + ":";
                strAvailabilityCacheKey += nodeOD.SelectSingle("Arrival/CityCode").NormalizedText + ":";
                strAvailabilityCacheKey += (this.IsCalendar())? "calendar" + ":": "";
            }
        }

        return strAvailabilityCacheKey;
    };

    /**
     * Builds cache shopping cache key
     * @returns {String}
     */
    this.GetShopppingCacheKey = function() {

        var strShoppingCacheKey = this.GetAvailabilityCacheKey();

        var nsTravelers = this.domRequest.SelectNodes(this.domRequest.Root, "TravelerIDs");
        if (nsTravelers) {
            for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                var nodeTraveler = nsTravelers.GetItem(indexTraveler);

                var strPaxType = nodeTraveler.GetAttribute("PaxType");
                if (!(strShoppingCacheKey.indexOf(strPaxType) > -1)) {
                    var nsTravelersPTC = this.domRequest.SelectNodes(this.domRequest.Root, "TravelerIDs[@PaxType = \"" + strPaxType + "\"]");

                    strShoppingCacheKey += nsTravelersPTC.Count.toString();
                    strShoppingCacheKey += strPaxType + ":";
                }
            }
        }

        if (this.domRequest.Root.SelectSingle("PricingInfo[@FareType]"))
            strShoppingCacheKey += this.domRequest.Root.SelectSingle("PricingInfo[@FareType]").GetAttribute("FareType") + ":";

        if (this.domRequest.Root.GetAttribute("BrandedFareSupport") == "Y")
            strShoppingCacheKey += "Branded:";

        return strShoppingCacheKey;
    };

    /**
     * Calculates cache expiration time
     * @param {{strDate: String, cacheRate: number}} parameters
     * @returns {number}
     */
    function GetCacheExpiration(parameters) {

        if (parameters.strDate && parameters.cacheRate) {
            var date = new Date();
            var month = Number(parameters.strDate.substring(5, 7)) - 1;
            var dateExpiration = new Date(parameters.strDate.substring(0, 4), month.toString(), parameters.strDate.substring(8));

            var dateDifference = parseInt(dateExpiration - date); //date difference in milliseconds
            var cacheExpire = parseInt(dateDifference) * parameters.cacheRate; // milliseconds
            cacheExpire = Math.round(cacheExpire * 100) / 100000;

            return cacheExpire;
        }

        return 0;
    }

    /**
     * Stores AirAvailabilityRS in cache
     * @param {{strCacheKey: String, strAirAvailabilityRS: String}} parameters
     */
    this.StoreAvailabilityInCache = function(parameters) {

        var isCacheEnabled = this.IsAppSettingEnabled("EnableAvailabilityCache");
        var strCacheRate = this.GetAppSettingValue("AvailabilityCacheRate");

        if (isCacheEnabled && strCacheRate && (Number(strCacheRate) > 0)) {
            TraceXml(__file__, "* Storing availability response in cache with key " + parameters.strCacheKey, parameters.strAirAvailabilityRS);

            SetCacheData("AirAvailability", parameters.strCacheKey, parameters.strAirAvailabilityRS, GetCacheExpiration({strDate: this.ItineraryDepartureDate(), cacheRate: Number(strCacheRate)}));
        }
    };

    /**
     * Stores FareSearchRS in cache
     * @param {{strCacheKey: String, strFareSearchRS: String}} parameters
     */
    this.StoreShoppingInCache = function(parameters) {

        var isCacheEnabled = this.IsAppSettingEnabled("EnableFareSearchCache");
        var strCacheRate = this.GetAppSettingValue("FareSearchCacheRate");

        if (isCacheEnabled && strCacheRate && (Number(strCacheRate) > 0)) {
            TraceXml(__file__, "* Storing shopping response in cache with key " + parameters.strCacheKey, parameters.strFareSearchRS);

            SetCacheData("FareSearch", parameters.strCacheKey, parameters.strFareSearchRS, GetCacheExpiration({strDate: this.ItineraryDepartureDate(), cacheRate: Number(strCacheRate)}));
        }
    };

    /**
     * Returns cached AirAvailabilityRS
     * @param {String} strCacheKey
     * @returns {String}
     */
    this.GetCachedAvailability = function(strCacheKey) {

        if (this.IsAppSettingEnabled("EnableAvailabilityCache")) {
            var strCachedResponse = GetCacheData("AirAvailability", strCacheKey);
            if (strCachedResponse) {
                TraceXml(__file__, "* Cached availability response for key " + strCacheKey, strCachedResponse);

                return strCachedResponse;
            }
        }

        return "";
    };

    /**
     * Returns cached FareSearchRS
     * @param {String} strCacheKey
     * @returns {String}
     */
    this.GetCachedShopping = function(strCacheKey) {

        if (this.IsAppSettingEnabled("EnableFareSearchCache")) {
            var strCachedResponse = GetCacheData("FareSearch", strCacheKey);
            if (strCachedResponse) {
                TraceXml(__file__, "* Cached shopping response for key " + strCacheKey, strCachedResponse);

                return strCachedResponse;
            }
        }

        return "";
    };

    /**
     * Builds DC availability request
     * @param {JsDCFareSearch} fareSearch
     * @returns {String}
     */
    function BuildAirAvailabilityRQ(fareSearch) {

        if (fareSearch.showTrace) TraceXml(__file__, "* FLX AirAvailabilityRQ input", fareSearch.domRequest.XML);
        var strAirAvailabilityRQ = fareSearch.xslt.Transform("jsCore/xslt/FLXFareSearchRQ_FLXAirAvailablityRQ.xsl", fareSearch.domRequest.XML);
        if (!strAirAvailabilityRQ)
            throw "144#Could not transform request.";
        if (fareSearch.showTrace) TraceXml(__file__, "* FLX AirAvailabilityRQ output", strAirAvailabilityRQ);

        return strAirAvailabilityRQ;
    };

    /**
     * Builds DC availability response
     * @param {{fareSearch: JsDCFareSearch, strAvailabilityRS: String}} parameters
     * @returns {String}
     */
    function BuildAirAvailabilityRS(parameters) {

        if (parameters.fareSearch.showTrace) TraceXml(__file__, "* FLX AirAvailabilityRS input", parameters.strAvailabilityRS);
        var strAirAvailabilityRS = parameters.fareSearch.xslt.Transform("jsCore/xslt/FLXAirAvailablityRS.xsl", parameters.strAvailabilityRS);
        if (!strAirAvailabilityRS)
            throw "144#Could not transform request.";
        if (parameters.fareSearch.showTrace) TraceXml(__file__, "* FLX AirAvailabilityRS output", strAirAvailabilityRS);

        return strAirAvailabilityRS;
    };

    /**
     * Gets DC availability
     */
    this.GetAvailability = function () {

        var domAirAvailabilityRS = new xxDomDocument();
        // gets cached availability
        var strAirAvailabilityRS = this.GetCachedAvailability(this.GetAvailabilityCacheKey());
        if (!strAirAvailabilityRS) {
            if (this.providerName == "FLXP") {
				this.domRequest.Root.SetAttribute("removeNumberInParty", "Y");
				this.domRequest.Root.SetAttribute("removePricingPreferences", "Y");
			}
            // builds AirAvailabilty request
            var strAirAvailabilityRQ = BuildAirAvailabilityRQ(this);

            var domAirAvailabilityRQ = new xxDomDocument();
            var providerDC = new JsXXServer(this.domTC);
            // calls availability
            domAirAvailabilityRS = this.serverSync.sendDC({strXXServerRequest: strAirAvailabilityRQ, native: false, logs: this.logs, endTransaction: true});

            // flags bounds
            var nsODs = domAirAvailabilityRS.Root.Select("OriginDestination");
            if (nsODs && domAirAvailabilityRQ.LoadXML(strAirAvailabilityRQ))
                for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                    var nodeOD = nsODs.GetItem(indexOD);

                    nodeOD.SetAttribute("matchDate", domAirAvailabilityRQ.Root.Select("OriginDestination").GetItem(indexOD).GetAttribute("matchDate"));
                    nodeOD.SetAttribute("rph", domAirAvailabilityRQ.Root.Select("OriginDestination").GetItem(indexOD).GetAttribute("rph"));
                }
        }
        else
            domAirAvailabilityRS.LoadXML(strAirAvailabilityRS);

        // checks availability errors
        if (domAirAvailabilityRS.Root.SelectSingle("InfoGroup[Error/Text]"))
            throw "DC#" + domAirAvailabilityRS.Root.SelectSingle("InfoGroup[Error/Text]").XML;
        else if (this.domRequest.Root.Select("OriginDestination").Count != domAirAvailabilityRS.Root.Select("OriginDestination[@matchDate = 'Y']").Count)
            throw "180000101";

        // stores availability cache
        this.StoreAvailabilityInCache({strCacheKey: this.GetAvailabilityCacheKey(), strAirAvailabilityRS: domAirAvailabilityRS.XML});

        this.domRequest.LoadXML(this.domRequest.XML.AddXML(BuildAirAvailabilityRS({fareSearch: this, strAvailabilityRS: domAirAvailabilityRS.XML.AddXML(this.domRequest.XML).AddXML(strAirAvailabilityRQ)})));

        // removes Flight/OriginDestination's if inventory is empty
        var nsODS = this.domRequest.Root.Select("AirAvailabilityRS/OriginDestination");
        if (nsODS)
            for (var indexOD = (nsODS.Count - 1); indexOD >= 0; indexOD--) {
                var nodeOD = nsODS.GetItem(indexOD);

                var nsFlights = nodeOD.Select("Flight");
                if (nsFlights)
                    for (var indexFlight = (nsFlights.Count - 1); indexFlight >= 0; indexFlight--) {
                        var nodeFlight = nsFlights.GetItem(indexFlight);

                        // removes Flight if inventory for at least one of its segment(s) is empty
                        if (nodeFlight.SelectSingle("Segment[not(Classes)]"))
                            nodeFlight.Delete();
                    }

                // removes OriginDestination with no Flights
                if (!nodeOD.SelectSingle("Flight"))
                    if (nodeOD.GetAttribute("matchDate") == "Y")
                        throw "180000101";
                    else
                        nodeOD.Delete();
            }

        // updates string request from validated DOM request
        this.requestXML = this.domRequest.XML;
    };

    /**
     * Builds FLX-M schedules request
     * @param {{fareSearch: JsDCFareSearch, isCalendar: Boolean}} parameters
     * @returns {String}
     */
    function BuildFlightSolutionsRQ(parameters) {

        if (parameters.fareSearch.showTrace) TraceXml(__file__, "* FLX-M FlightSolutionsRQ input" + ((parameters.isCalendar)? " calendar": ""), (parameters.isCalendar)? parameters.fareSearch.domRequest.XML: parameters.fareSearch.domRequest.XML.removesAllBetween({strStartMatch: "<DayWindow", strEndMatch: "</DayWindow>"}));

        var strFlightSolutionsRQ = "";
        if (parameters.fareSearch.airAvailabilityFromSchedules) {
            if (!parameters.isCalendar) parameters.fareSearch.domRequest.Root.SetAttribute("numberOfAlternates", parameters.fareSearch.numberOfAlternates);
            strFlightSolutionsRQ = parameters.fareSearch.xslt.Transform("jsCore/xslt/FLXFareSearchRQ_FLXAirAvailablityRQ.xsl", (parameters.isCalendar)? parameters.fareSearch.domRequest.XML: parameters.fareSearch.domRequest.XML.removesAllBetween({strStartMatch: "<DayWindow", strEndMatch: "</DayWindow>"}));
            if (!parameters.isCalendar) parameters.fareSearch.domRequest.Root.RemoveAttribute("numberOfAlternates");
        }
        else
            strFlightSolutionsRQ = parameters.fareSearch.xslt.Transform("jsCore/xslt/FLXFareSearchRQ_FLXFlightSolutionsRQ.xsl", parameters.fareSearch.domRequest.XML);

        if (!strFlightSolutionsRQ)
            throw "144#Could not transform request.";
        if (parameters.fareSearch.showTrace) TraceXml(__file__, "* FLX-M FlightSolutionsRQ output" + ((parameters.isCalendar)? " calendar": ""), strFlightSolutionsRQ);

        return strFlightSolutionsRQ;
    };

    /**
     * Adds schedules info to proper bound in request
     * @param {{fareSearch: JsDCFareSearch, domFlightSolutionRS: xxDomDocument}} parameters
     */
    function AddFlightInformation(parameters) {

        var nsODs = parameters.fareSearch.domRequest.Root.Select("OriginDestination");
        if (nsODs)
            for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                var nodeOD = nsODs.GetItem(indexOD);

                var strODRef = nodeOD.GetAttribute("ODRef");
                var nodeODFlightSolutionRS = parameters.domFlightSolutionRS.Root.SelectSingle("OriginDestination[@Ref = \"" + strODRef + "\"]");
                if (nodeODFlightSolutionRS) {
                    if (nodeOD.SelectSingle("Preferences/FlightType[@StopDirect = \"Y\"]")) {
                        var nsSolutions = nodeODFlightSolutionRS.Select("Solutions/Solution");
                        if (nsSolutions)
                            for (var indexSolution = (nsSolutions.Count - 1); indexSolution >= 0; indexSolution--) {
                                var nodeSolution = nsSolutions.GetItem(indexSolution);

                                if (nodeSolution.SelectSingle("Flights[not(Flt[1]/Num = Flt[2]/Num)]"))
                                    nodeSolution.Delete();
                            }
                    }

                    // add dates to each Flt
                    var strDepartureDate = nodeOD.SelectSingle("Date").NormalizedText;
                    var nsFlts = nodeODFlightSolutionRS.Select("Solutions/Solution/Flights/Flt");
                    if (nsFlts)
                        for (var indexFlt = 0; indexFlt < nsFlts.Count; indexFlt++) {
                            var nodeFlt = nsFlts.GetItem(indexFlt);

                            var nodeDepDate = parameters.domFlightSolutionRS.CreateElementNode("DepDate");
                            var nodeDepDateText = parameters.domFlightSolutionRS.CreateTextNode(strDepartureDate);
                            // adds date difference
                            if (!nodeFlt.SelectSingle("DepDateDiff[./@DepDay = \"0\"]")) {
                                var daysDifference = Number(nodeFlt.SelectSingle("DepDateDiff").GetAttribute("DepDay").substr(1));
                                var dateDeparture = new Date(strDepartureDate.substring(0, 4), strDepartureDate.substring(5, 7) - 1, strDepartureDate.substring(8, 10));
                                if(nodeFlt.SelectSingle("DepDateDiff").GetAttribute("DepDay").indexOf("+") > -1)
                                    nodeDepDateText = parameters.domFlightSolutionRS.CreateTextNode(dateDeparture.GetAfterDates(daysDifference)[daysDifference - 1]);
                                else
                                    nodeDepDateText = parameters.domFlightSolutionRS.CreateTextNode(dateDeparture.GetBeforeDates(daysDifference)[daysDifference - 1]);
                            }

                            nodeDepDate.AppendChild(nodeDepDateText);
                            nodeFlt.AppendChild(nodeDepDate);
                        }

                    // stores all calendar dates
                    var nsCalendarDates = nodeOD.Select("Preferences/DayWindow/Date");
                    if (nsCalendarDates) {
                        var nsSolutions = nodeODFlightSolutionRS.Select("Solutions/Solution");
                        if (nsSolutions)
                            for (var indexSolution = 0; indexSolution < nsSolutions.Count; indexSolution++) {
                                var nodeDepDates = nsSolutions.GetItem(indexSolution).SelectSingle("DepDates");

                                var nsDates = nodeDepDates.Select("Date");
                                if (nsDates)
                                    for (var indexDate = 0; indexDate < nsDates.Count; indexDate++) {
                                        var nodeDate = nsDates.GetItem(indexDate);

                                        var strD = nodeDate.GetAttribute("D");
                                        if (strD) {
                                            var strTo = nodeDate.GetAttribute("To");
                                            for (var indexCalendarDate = 0; indexCalendarDate < nsCalendarDates.Count; indexCalendarDate++) {
                                                var strCalendarDate = nsCalendarDates.GetItem(indexCalendarDate).NormalizedText;

                                                if (strD == strCalendarDate) {
                                                    var nodeCalendarDate = parameters.domFlightSolutionRS.CreateElementNode("CalendarDate");
                                                    var nodeCalendarDateText = parameters.domFlightSolutionRS.CreateTextNode(strCalendarDate);
                                                    nodeCalendarDate.AppendChild(nodeCalendarDateText);
                                                    nodeDepDates.AppendChild(nodeCalendarDate);
                                                }
                                                else {
                                                    if (strTo) {
                                                        if (strTo == strCalendarDate) {
                                                            var nodeCalendarDate = parameters.domFlightSolutionRS.CreateElementNode("CalendarDate");
                                                            var nodeCalendarDateText = parameters.domFlightSolutionRS.CreateTextNode(strCalendarDate);
                                                            nodeCalendarDate.AppendChild(nodeCalendarDateText);
                                                            nodeDepDates.AppendChild(nodeCalendarDate);
                                                        }
                                                        else {
                                                            var dateCalendarDate = new Date(strCalendarDate.substring(0, 4), strCalendarDate.substring(5, 7) - 1, strCalendarDate.substring(8, 10));
                                                            var dateD = new Date(strD.substring(0, 4), strD.substring(5, 7) - 1, strD.substring(8, 10));
                                                            var dateTo = new Date(strTo.substring(0, 4), strTo.substring(5, 7) - 1, strTo.substring(8, 10));

                                                            if (dateD < dateCalendarDate < dateTo) {
                                                                var nodeCalendarDate = parameters.domFlightSolutionRS.CreateElementNode("CalendarDate");
                                                                var nodeCalendarDateText = parameters.domFlightSolutionRS.CreateTextNode(strCalendarDate);
                                                                nodeCalendarDate.AppendChild(nodeCalendarDateText);
                                                                nodeDepDates.AppendChild(nodeCalendarDate);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                            }
                    }

                    nodeOD.AppendChild(nodeODFlightSolutionRS);
                }
            }
    }

    /**
     * Gets FLX-M schedules
     * @param {Boolean} addInventory
     */
    this.GetSchedules = function (addInventory) {

        var strAirAvailabilityRS = this.GetCachedAvailability(this.GetAvailabilityCacheKey());
        if (strAirAvailabilityRS) {
            this.domRequest.LoadXML(this.domRequest.XML.AddXML(strAirAvailabilityRS));

            // updates string request from validated DOM request
            this.requestXML = this.domRequest.XML;
        }
        else {
			if (this.providerName == "FLXP") {
                this.domRequest.Root.SetAttribute("removeNumberInParty", "Y");
                this.domRequest.Root.SetAttribute("removePricingPreferences", "Y");
            }

            // builds schedules request
            var strFlightSolutionsRQ = BuildFlightSolutionsRQ({fareSearch: this, isCalendar: this.IsCalendar()});;

            try {
                // calls FLX-M schedule builder engine
                var domFlightSolutionRS = this.serverSync.sendFLXM({strXXServerRequest: strFlightSolutionsRQ, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: "schedules", native: this.airAvailabilityFromSchedules, logs: this.logs, endTransaction: true});

                if (this.airAvailabilityFromSchedules || (domFlightSolutionRS.Root && domFlightSolutionRS.Root.SelectSingle("OriginDestination"))) {
                    // adds schedules info to proper bound in request
                    if (!this.airAvailabilityFromSchedules)
                        AddFlightInformation({fareSearch: this, domFlightSolutionRS: domFlightSolutionRS});

                    // adds inventory for schedules
                    if (addInventory) {

                        var domAirAvailabilityRS = null;
                        var strAirAvailabilityRQ = null;
                        if (!this.airAvailabilityFromSchedules) {
                            if (this.domRequest.Root.SelectSingle("OriginDestination[not(OriginDestination)]"))
                                throw "180000101";

                            strAirAvailabilityRQ = BuildAirAvailabilityRQ(this);

                            // calls DC AirAvailabilty
                            var domAirAvailabilityRS = this.serverSync.sendDC({strXXServerRequest: strAirAvailabilityRQ, native: false, logs: this.logs, endTransaction: true});
                        }
                        else {
                            strAirAvailabilityRQ = strFlightSolutionsRQ;
                            domAirAvailabilityRS = domFlightSolutionRS;
                        }

                        if (domAirAvailabilityRS.Root && domAirAvailabilityRS.Root.SelectSingle("InfoGroup/Error"))
                            throw domAirAvailabilityRS.Root.SelectSingle("InfoGroup[Error/Text]").XML;
                        else if (this.airAvailabilityFromSchedules && ((domAirAvailabilityRS.indexOf("InfoGroup") > -1) || (domAirAvailabilityRS.indexOf("Error") > -1)))
                            throw "180000101";
                        else {
                            strAirAvailabilityRQ = BuildAirAvailabilityRS({fareSearch: this, strAvailabilityRS: (this.airAvailabilityFromSchedules? domAirAvailabilityRS: domAirAvailabilityRS.XML).AddXML(this.domRequest.XML).AddXML(strAirAvailabilityRQ)});
                            this.domRequest.LoadXML(this.domRequest.XML.AddXML(strAirAvailabilityRQ));

                            // stores availability cache
                            this.StoreAvailabilityInCache({strCacheKey: this.GetAvailabilityCacheKey(), strAirAvailabilityRS: strAirAvailabilityRQ});
                        }

                        // deletes bound(s) if inventory for flights and/or segments are empty
                        var nsODS = this.domRequest.Root.Select("AirAvailabilityRS/OriginDestination");
                        if (nsODS)
                            for (var indexOD = (nsODS.Count - 1); indexOD >= 0; indexOD--) {
                                var nodeOD = nsODS.GetItem(indexOD);

                                var nsFlights = nodeOD.Select("Flight");
                                if (nsFlights)
                                    for (var indexFlight = (nsFlights.Count - 1); indexFlight >= 0; indexFlight--) {
                                        var nodeFlight = nsFlights.GetItem(indexFlight);

                                        // removes flight if inventory for at least one of its segment(s) is empty
                                        if (nodeFlight.SelectSingle("Segment[not(Classes)]"))
                                            nodeFlight.Delete();
                                    }
                            }

                        // deletes bound(s) if inventory for flights and/or segments are empty
                        var nsODS = this.domRequest.Root.Select("OriginDestination");
                        if (nsODS)
                            for (var indexOD = (nsODS.Count - 1); indexOD >= 0; indexOD--) {
                                var nodeOD = nsODS.GetItem(indexOD);

                                if (nodeOD.SelectSingle("OriginDestination"))
                                    nodeOD.SelectSingle("OriginDestination").Delete()
                                if (nodeOD.SelectSingle("Flight"))
                                    nodeOD.SelectSingle("Flight").Delete()
                            }
                    }

                    // updates string request from validated DOM request
                    this.requestXML = this.domRequest.XML;
                }
                else
                    throw domFlightSolutionRS.XML;
            }
            catch (error) {
                if(error.toString().indexOf("Socket") >= 0) {
                    TraceXml(__file__, "* FLX-M schedules were not returned successfully", error.toString());
                    throw "180000056"
                }
                else
                    throw "180000057";
            }
        }
    }

    /**
     * Checks eligibility for different criteria
     * @param {String} strFLXMConfig
     * @returns {Boolean}
     */
    this.IsEligible = function (strFLXMConfig) {

        try {
            // builds FLXM provider tc
            var domFLXMTC = BuildFLXMTC({domTC: this.domTC, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: strFLXMConfig});
            var providerFLXM = new JsXXServer(domFLXMTC);

            providerFLXM.SendTransaction({strXXServerRequest: this.BuildServiceListRQ(), endTransaction: true});

            return !(providerFLXM.IsErrorResponse());
        }
        catch (error) {}

        return false;
    };

    /**
     *  calls FLX-M for market eligibility rules
     * @param {function} custom
     */
    this.eligibility = function (custom) {

        try {
            // call FLX-M for market eligibilty
            var serviceListDOM = this.serverSync.sendFLXM({strXXServerRequest: this.BuildServiceListRQ(), nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: "eligibility", native: false, logs: this.logs, endTransaction: true})

            custom(serviceListDOM, this);
        }
        catch (error) {
            if (this.showTrace) TraceText(__file__, "* FLX-M eligibility call failed", error.toString());
        }
    };

    /**
     * Gets services from FLX-M
     * @param {String} strFLXMConfig
     * @returns {xxDomDocument}
     */
    this.GetServices = function (strFLXMConfig) {

        try {
            // builds FLXM provider tc
            var domFLXMTC = BuildFLXMTC({domTC: this.domTC, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: strFLXMConfig});
            var providerFLXM = new JsXXServer(domFLXMTC);

            var domServiceListRS = providerFLXM.SendTransaction({strXXServerRequest: this.BuildServiceListRQ(), endTransaction: true});

            if (providerFLXM.IsErrorResponse() || !domServiceListRS || !domServiceListRS.Root.SelectSingle("OptionalServices/Service")) {
                // services were not returned
                domServiceListRS = new xxDomDocument();
                domServiceListRS.LoadXML("<ServiceListRS><InfoGroup><Error><Text>No services found</Text></Error></InfoGroup></ServiceListRS>");
            }

            return domServiceListRS;
        }
        catch (error) {
            TraceText(__file__, "* Services was not completed successfully", error.toString());
        }
    };

    /**
     * Updates the FareGroup/TravelerGroup/Price/Taxes elements with amount deducted
     * @param {{nodeTaxes: xxNode, amount: Number}} parameters
     * @returns {String}
     */
    function DeductAmount(parameters) {

        if (parameters.nodeTaxes && parameters.amount) {
            // Taxes
            var strTaxesAmount = parameters.nodeTaxes.GetAttribute("Amount");
            if (strTaxesAmount)
                parameters.nodeTaxes.SetAttribute("Amount", (Number(strTaxesAmount) - parameters.amount).toString());

            // Price
            var strPriceAmount = parameters.nodeTaxes.Parent.GetAttribute("Total");
            if (strPriceAmount)
                parameters.nodeTaxes.Parent.SetAttribute("Total", (Number(strPriceAmount) - parameters.amount).toString());

            var travelerCount = 1;
            var nodeTravelerGroup = parameters.nodeTaxes.Parent.Parent;
            if (nodeTravelerGroup && nodeTravelerGroup.GetAttribute("TypeCount"))
                travelerCount = Number(nodeTravelerGroup.GetAttribute("TypeCount"));

            // TravelerGroup
            var strTravelerGroupAmount = parameters.nodeTaxes.Parent.Parent.GetAttribute("TypeTotalPrice");
            if (strTravelerGroupAmount)
                parameters.nodeTaxes.Parent.Parent.SetAttribute("TypeTotalPrice", (Number(strTravelerGroupAmount) - (parameters.amount*travelerCount)).toString());

            // FareGroup
            var strFareGroupAmount = parameters.nodeTaxes.Parent.Parent.Parent.GetAttribute("TotalPrice");
            if (strFareGroupAmount)
                parameters.nodeTaxes.Parent.Parent.Parent.SetAttribute("TotalPrice", (Number(strFareGroupAmount) - (parameters.amount*travelerCount)).toString());
        }
    }

    /**
     * Removes all taxes supplied(but or only depending on exclude flag) and deducts amount based on flag from each FareGroup
     * @param {{domFareSearchRS: xxDomDocument, arrTaxes: Array, exclude: Boolean, deductAmount: Boolean}} parameters
     * @returns {String}
     */
    this.RemoveTaxes = function(parameters) {

        var nsPrices = parameters.domFareSearchRS.SelectNodes(parameters.domFareSearchRS.Root, "FareGroup/TravelerGroup/Price[Taxes/Tax]");
        if (nsPrices) {
            for (var indexPrice = 0; indexPrice < nsPrices.Count; indexPrice++) {
                var nodeTaxes = nsPrices.GetItem(indexPrice).SelectSingle("Taxes");

                var nodeTax = nodeTaxes.SelectSingle("Tax");
                while (nodeTax) {
                    var strTaxCode = nodeTax.SelectSingle("Designator").NormalizedText;
                    var nodeNextTax = nodeTax.NextSibling;

                    if (parameters.arrTaxes && parameters.arrTaxes.length > 0) {
                        if ((parameters.exclude && !(parameters.arrTaxes.indexOf(strTaxCode) > -1) || (!parameters.exclude && parameters.arrTaxes.indexOf(strTaxCode) > -1))) {
                            if (parameters.deductAmount)
                                DeductAmount({nodeTaxes: nodeTaxes, amount: Number(nodeTax.GetAttribute("Amount"))});

                            nodeTax.Delete();
                        }
                    }
                    else
                        nodeTax.Delete();

                    nodeTax = nodeNextTax;
                }
            }
        }

        var nsFareComponents = parameters.domFareSearchRS.SelectNodes(parameters.domFareSearchRS.Root, "FareGroup/TravelerGroup/FareRules/FareInfo/FareComponent[Taxes/Tax]");
        if (nsFareComponents) {
            for (var indexFareComponent = 0; indexFareComponent < nsFareComponents.Count; indexFareComponent++) {
                var nodeTaxes = nsFareComponents.GetItem(indexFareComponent).SelectSingle("Taxes");

                var nodeTax = nodeTaxes.SelectSingle("Tax");
                while (nodeTax) {
                    var strTaxCode = nodeTax.SelectSingle("Designator").NormalizedText;
                    var nodeNextTax = nodeTax.NextSibling;

                    if (parameters.arrTaxes && parameters.arrTaxes.length > 0) {
                        if ((parameters.exclude && !(parameters.arrTaxes.indexOf(strTaxCode) > -1) || (!parameters.exclude && parameters.arrTaxes.indexOf(strTaxCode) > -1))) {
                            nodeTax.Remove();
                            nodeTax.Delete();
                        }
                    }
                    else {
                        nodeTax.Remove();
                        nodeTax.Delete();
                    }

                    nodeTax = nodeNextTax;
                }
            }
        }

        TraceXml("(" + this.airlineId + ") " + __file__, ((parameters.exclude)? "* Remove taxes but": "* Remove taxes only") + " (" + parameters.arrTaxes + ")", parameters.domFareSearchRS.XML);
    };
}

JsDCFlightPrice.prototype = new JsBaseFlightPrice();

/**
 * JsDCFlightPrice object constructor for DC FlightPrice transaction
 * @constructor
 * @param {function} AirlineRequestValidation
 */
function JsDCFlightPrice(AirlineRequestValidation) {

    this.isPricing = true;
    this.doOBFees = true;
    this.doPrice = true;
    this.doServices = true;
    this.gotServices = false;
    this.domServiceListRS;

    /**
     * Performs pricing call for the configured provider
     * @param {String} strFlightPriceRQ
     * @returns {xxDomDocument}
     */
    this.Price = function(strFlightPriceRQ) {

        var domFlightPriceRS;
        // calls configured provider
        if (this.provider && (this.provider.providerName == "TVP") && !this.IsAutoExchange())
            domFlightPriceRS = this.provider.Price(this);
        else
            domFlightPriceRS = this.serverSync.sendProvider({strXXServerRequest: strFlightPriceRQ, nodeProvider: this.GetProvider(), native: false, logs: this.logs, endTransaction: true});

        // updates travelers in the request with PaxPriced and a reference to the correspondent TravelerGroup position
        var nsTravelers = this.domRequest.SelectNodes(this.domRequest.Root, "TravelerIDs");
        if (nsTravelers) {
            for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                var nodeTravelerIDs = nsTravelers.GetItem(indexTraveler);

                var strAssociationID = nodeTravelerIDs.GetAttribute("AssociationID");
                var strPaxType = nodeTravelerIDs.GetAttribute("PaxType");
                var strPaxPriced = nodeTravelerIDs.GetAttribute("PaxPriced");

                // traveler direct association between request and response
                var nodeTravelerGroup = domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup[TravelerIDRef = \"" + strAssociationID + "\"]");
                if (!nodeTravelerGroup) {
                    // traveler association between request and response by TypeRequested and TypePriced or TypeRequested
                    nodeTravelerGroup = domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup[./@TypeRequested = \"" + strPaxType + "\" and ./@TypePriced = \"" + strPaxPriced + "\"]");
                    if (!nodeTravelerGroup)
                        nodeTravelerGroup = domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup[./@TypeRequested = \"" + strPaxType + "\"]");
                }

                if (nodeTravelerGroup) {
                    nodeTravelerIDs.SetAttribute("PaxPriced", nodeTravelerGroup.GetAttribute("TypePriced"));
                    nodeTravelerIDs.SetAttribute("TGIndex", (nodeTravelerGroup.CountPrevSiblings() + 1).toString());
                }
            }
        }

        // adds the @PriceClass and @Code at FareInfo/FareBasisCode level
        var nsSegmentIDRefs = this.domRequest.SelectNodes(this.domRequest.Root, "PricingInfo/SegmentIDRef[@PriceClassCode or @PriceClassName]");
        var nsTravelerGroups = domFlightPriceRS.SelectNodes(domFlightPriceRS.Root, "FareGroup/TravelerGroup");
        if (nsTravelerGroups) {
            for (var indexTravelerGroup = 0; indexTravelerGroup < nsTravelerGroups.Count; indexTravelerGroup++) {
                var nodeTravelerGroup = nsTravelerGroups.GetItem(indexTravelerGroup);

                var nsRelatedSegments = domFlightPriceRS.SelectNodes(nodeTravelerGroup, "FareRules/FareInfo/RelatedSegment");
                if (nsSegmentIDRefs && nsRelatedSegments) {
                    for (var indexSegmentIDRef = 0; indexSegmentIDRef < nsSegmentIDRefs.Count; indexSegmentIDRef++) {
                        var nodeSegmentIDRef = nsSegmentIDRefs.GetItem(indexSegmentIDRef);

                        var nodeFlight = this.domRequest.Root.SelectSingle("OriginDestination/Flight[@AssociationID = \"" + nodeSegmentIDRef.NormalizedText + "\"]");
                        if (nodeFlight && nodeFlight.GetAttribute("rph")) {
                            if (nsRelatedSegments.GetItem(Number(nodeFlight.GetAttribute("rph")))) {
                                var nodeFareBasisCode = nsRelatedSegments.GetItem(Number(nodeFlight.GetAttribute("rph"))).Parent.SelectSingle("FareBasisCode");
                                // adds @Code
                                if (nodeSegmentIDRef.GetAttribute("PriceClassCode") && nodeFareBasisCode && !nodeFareBasisCode.GetAttribute("Code"))
                                    nodeFareBasisCode.SetAttribute("Code", nodeSegmentIDRef.GetAttribute("PriceClassCode"));
                                // adds @PriceClass
                                if (nodeSegmentIDRef.GetAttribute("PriceClassName") && nodeFareBasisCode && !nodeFareBasisCode.GetAttribute("PriceClass"))
                                    nodeFareBasisCode.SetAttribute("PriceClass", nodeSegmentIDRef.GetAttribute("PriceClassName"));
                            }
                        }
                    }
                }
            }
        }

        // adds the FareTariff to FlightPriceRQ/OriginDestination/Flight
        if (domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup[1]/FareRules/FareInfo/FareTariff")) {

            var nsFareTariff = domFlightPriceRS.SelectNodes(domFlightPriceRS.Root, "FareGroup/TravelerGroup[1]/FareRules/FareInfo/FareTariff");
            for (var indexRuleTariff = 0; indexRuleTariff < nsFareTariff.Count; indexRuleTariff++) {

                var nodeFareTariff = nsFareTariff.GetItem(indexRuleTariff);
                var nsRelatedSegments = domFlightPriceRS.SelectNodes(nodeFareTariff, "../RelatedSegment");
                for (var indexRelatedSegments = 0; indexRelatedSegments < nsRelatedSegments.Count; indexRelatedSegments++) {

                    var nodeRelatedSegment = nsRelatedSegments.GetItem(indexRelatedSegments);
                    var nodeFlight = this.domRequest.Root.SelectSingle("OriginDestination/Flight[@FlightRefKey = '" + nodeRelatedSegment.SelectSingle("SegmentIDRef").GetAttribute("FlightRefKey") + "']");
                    if (nodeFlight)
                        nodeFlight.AppendChild(nodeFareTariff.Clone());
                    else {

                        var strFlightNumber = nodeRelatedSegment.SelectSingle("FlightNumber").NormalizedText;
                        var strDepDate = nodeRelatedSegment.SelectSingle("DepartureDate").NormalizedText;
                        var strDepCode = nodeRelatedSegment.SelectSingle("DepartureCode").NormalizedText;
                        var strArrCode = nodeRelatedSegment.SelectSingle("ArrivalCode").NormalizedText;

                        var nodeFlight = this.domRequest.Root.SelectSingle("OriginDestination/Flight[./FlightNumber = '" + strFlightNumber + "' and ./Departure/AirportCode = '" + strDepCode +
                            "' and ./Departure/Date = '" + strDepDate + "' and ./Arrival/AirportCode = '" + strArrCode + "']");
                        if (nodeFlight)
                            nodeFlight.AppendChild(nodeFareTariff.Clone());
                    }
                }
            }
        }

        // adds the CommissionSource attribute to FlightPriceRS/FareGroup/TravelerGroup/CommissionGroup/Commission
        var nsCommissions = domFlightPriceRS.SelectNodes(domFlightPriceRS.Root, "FareGroup/TravelerGroup/CommissionGroup/Commission[not(@CommissionSource)]");
        if (nsCommissions)
            for (var indexCommission = 0; indexCommission < nsCommissions.Count; indexCommission++)
                nsCommissions.GetItem(indexCommission).SetAttribute("CommissionSource", "P");

        if (!domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/Price/Taxes/Tax/@Paid") && flightPrice.IsAutoExchange() && domFlightPriceRS.Root.SelectSingle("FareGroup") && domFlightPriceRS.Root.SelectSingle("FareGroup[@SolutionType != \"T\"]") && (flightPrice.domTC.Root.SelectSingle("ACLInfo/TktReporting").NormalizedText == "BSP"))
            domFlightPriceRS = this.CalculateAddCollectTaxes({domFlightPriceRS: domFlightPriceRS, domRequest: flightPrice.domRequest, domTC: flightPrice.domTC});

        return domFlightPriceRS;
    };

    /**
     * Performs asyncronic pricing call(s) for the configured pricing provider
     * @param {Array} arrFlightPriceRQs
     * @param {Boolean} native
     * @returns {xxDomDocument|String}
     */
    this.PriceAsync = function(arrFlightPriceRQs, native) {

        var arrFlightPriceRSs = this.serverAsync.sendProvider({arrXXServerRQs: arrFlightPriceRQs, nodeProvider: this.GetProvider(), logs: this.logs, endTransaction: true});
        if (arrFlightPriceRSs && ((typeof native === 'undefined') || !native)) {
            // merge responses
            var validSolution = false;
            var indexAsyncFlightPriceRS = 0;
            var domFlightPriceRS = new xxDomDocument();
            while (!validSolution && indexAsyncFlightPriceRS < arrFlightPriceRQs.length) {
                if (domFlightPriceRS.LoadXML(arrFlightPriceRSs[indexAsyncFlightPriceRS]))
                    if (domFlightPriceRS.Root.SelectSingle("FareGroup"))
                        validSolution = true;

                indexAsyncFlightPriceRS++;
            }

            if (validSolution) {
                for (indexAsyncFlightPriceRS; indexAsyncFlightPriceRS < arrFlightPriceRSs.length; indexAsyncFlightPriceRS++) {
                    var strAsyncFlightPriceRS = arrFlightPriceRSs[indexAsyncFlightPriceRS];

                    var domAsyncFlightPriceRS = new xxDomDocument();
                    if (domAsyncFlightPriceRS.LoadXML(strAsyncFlightPriceRS)) {
                        if (domAsyncFlightPriceRS.Root.SelectSingle("InfoGroup[ForInfo]") && domAsyncFlightPriceRS.Root.SelectSingle("FareGroup")) {
                            if (domFlightPriceRS.Root.SelectSingle("InfoGroup")) {
                                var nsForInfos = domAsyncFlightPriceRS.SelectNodes(domAsyncFlightPriceRS.Root, "InfoGroup/ForInfo")
                                for (var indexForInfo = 0; indexForInfo < nsForInfos.Count; indexForInfo++)
                                    domFlightPriceRS.Root.SelectSingle("InfoGroup").AppendChild(nsForInfos.GetItem(indexForInfo));
                            }
                            else
                                domFlightPriceRS.Root.FirstChild.InsertBefore(domAsyncFlightPriceRS.Root.SelectSingle("InfoGroup").Clone());
                        }

                        var nsFareGroups = domAsyncFlightPriceRS.Root.Select("FareGroup")
                        if (nsFareGroups)
                            domFlightPriceRS.Root.AppendChildren(nsFareGroups);
                    }
                }
            }
            else {
                indexAsyncFlightPriceRS = 0;
                while (indexAsyncFlightPriceRS < arrFlightPriceRQs.length) {
                    if (domFlightPriceRS.LoadXML(arrFlightPriceRSs[indexAsyncFlightPriceRS]))
                        if (domFlightPriceRS.Root.SelectSingle("InfoGroup"))
                            throw "DC#" + domFlightPriceRS.Root.SelectSingle("InfoGroup").XML;

                    indexAsyncFlightPriceRS++;
                }

                throw "719#No fares available.";
            }
        }

        return domFlightPriceRS;
    };

    /**
     * Gets FLXM pricing rules (discounts, taxes, etc)
     * @param {{domFlightPriceRS: xxDomDocument, strFLXMEnvironment: String}} parameters
     * @returns {xxDomDocument}
     */
    this.GetFLXMPricingRules = function(parameters) {

        try {
            if (parameters.domFlightPriceRS.Root.SelectSingle("FlightPriceRQ"))
                parameters.domFlightPriceRS.Root.SelectSingle("FlightPriceRQ").Delete();

            var domAlterFlightPriceRQ = new xxDomDocument();
            domAlterFlightPriceRQ.LoadXML("<AlterFlightPriceRQ/>");
            domAlterFlightPriceRQ.Root.AppendChild(parameters.domFlightPriceRS.Root.Clone());

            // adds CustomParams to the PricingInfo
            var nodeCompanyIndex = this.domRequest.Root.SelectSingle("PricingInfo/SpecialFareQualifiers/CompanyIndex");
            if (nodeCompanyIndex) {
                var nodeCustomParams = this.domRequest.PutNode(this.domRequest.Root.SelectSingle("PricingInfo"), "CustomParams");
                var nodeParam = this.domRequest.PutNode(nodeCustomParams, "Param");
                nodeParam.SetAttribute("Name", "CompanyIndex");
                this.domRequest.PutNode(nodeParam, "Value", nodeCompanyIndex.NormalizedText);
                nodeCompanyIndex.Parent.Delete();
            }
            var nsCustomerID = this.domRequest.SelectNodes(this.domRequest.Root, "TravelerIDs/CustomerID");
            if (nsCustomerID) {
                for (var indexCustomerID = 0; indexCustomerID < nsCustomerID.Count; indexCustomerID++) {
                    var nodeCustomerID = nsCustomerID.GetItem(indexCustomerID);
                    nodeCustomerID.Delete();
                }
            }

            domAlterFlightPriceRQ.Root.AppendChild(this.domRequest.Root.Clone());
            if (this.removeTicketForMerchandising && domAlterFlightPriceRQ.Root.SelectSingle("FlightPriceRQ/TicketImageRS"))
                domAlterFlightPriceRQ.Root.SelectSingle("FlightPriceRQ/TicketImageRS").Delete();
            if (domAlterFlightPriceRQ.Root.SelectSingle("FlightPriceRQ/PNRViewRS"))
                domAlterFlightPriceRQ.Root.SelectSingle("FlightPriceRQ/PNRViewRS").Delete();

            var domFLXMTC = BuildFLXMTC({domTC: this.domTC, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: parameters.strFLXMEnvironment});
            var providerFLXM = new JsXXServer(domFLXMTC);

            var domFlightPriceRS = providerFLXM.SendTransaction({strXXServerRequest: domAlterFlightPriceRQ.XML, endTransaction: true});
            if (!providerFLXM.IsFLXMValidErrorResponse() && !providerFLXM.IsErrorResponse()) {

                // adds TourCode node to FlightPriceRS/FareGroup/TravelerGroup/FareRules/TourCode
                var nsFareCompReason = domFlightPriceRS.SelectNodes(domFlightPriceRS.Root, "FareGroup/TravelerGroup/FareRules[FareInfo/FareComponent/Reason]");
                if (nsFareCompReason) {
                    for (var indexFareCompReason = 0; indexFareCompReason < nsFareCompReason.Count; indexFareCompReason++) {
                        var nsFareInfo = nsFareCompReason.GetItem(indexFareCompReason);
                        if (nsFareInfo) {
                            var nsReason = nsFareInfo.SelectSingle("FareInfo/FareComponent/Reason") ? nsFareInfo.SelectSingle("FareInfo/FareComponent/Reason") : null;
                            if (nsReason) {
                                var nsTourCode = CreateNode({flightpricerq: domFlightPriceRS, nodeName: "TourCode", date: nsReason});
                                nsFareInfo.AppendChild(nsTourCode);
                            }
                        }
                    }
                }

                // adds the CommissionSource attribute to FlightPriceRS/FareGroup/TravelerGroup/CommissionGroup/Commission
                var nsCommissions = domFlightPriceRS.SelectNodes(domFlightPriceRS.Root, "FareGroup/TravelerGroup/CommissionGroup/Commission[not(@CommissionSource)]");
                if (nsCommissions)
                    for (var indexCommission = 0; indexCommission < nsCommissions.Count; indexCommission++)
                        nsCommissions.GetItem(indexCommission).SetAttribute("CommissionSource", "X");

                // adds the CurrencyCode at ServicePrice level
                var nsServicePrice = domFlightPriceRS.SelectNodes(domFlightPriceRS.Root, "FareGroup/IncludedServices/Service/ServicePrice[not(CurrencyCode)]");
                var nodeCurrencyCode = domFlightPriceRS.Root.SelectSingle("FareGroup/CurrencyCode");
                if (nsServicePrice && nodeCurrencyCode)
                    for (var indexServicePrice = 0; indexServicePrice < nsServicePrice.Count; indexServicePrice++)
                        nsServicePrice.GetItem(indexServicePrice).AppendChild(nodeCurrencyCode.Clone());

                // adds @SourceFare attribute back to the FareInfo/FareBasisCode
                var nsTravelerGroups = parameters.domFlightPriceRS.Root.Select("FareGroup/TravelerGroup[FareRules/FareInfo/FareBasisCode[@SourceFare]]");
                if (nsTravelerGroups) {
                    for (var indexTravelerGroups = 0; indexTravelerGroups < nsTravelerGroups.Count; indexTravelerGroups++) {
                        var nodeTravelerGroup = nsTravelerGroups.GetItem(indexTravelerGroups);
                        var strTravelerIDRef = nodeTravelerGroup.SelectSingle("TravelerIDRef").NormalizedText;

                        var nsResponseTravelerGroups = domFlightPriceRS.Root.Select("FareGroup/TravelerGroup[TravelerIDRef = '" + strTravelerIDRef + "' and not(FareRules/FareInfo/FareBasisCode[@SourceFare])]");
                        if (nsResponseTravelerGroups) {
                            for (var indexResponseTravelerGroups = 0; indexResponseTravelerGroups < nsResponseTravelerGroups.Count; indexResponseTravelerGroups++) {
                                var nsFareInfos = nodeTravelerGroup.Select("FareRules/FareInfo");
                                if (nsFareInfos) {
                                    var nsResponseFareInfos = nsResponseTravelerGroups.GetItem(indexResponseTravelerGroups).Select("FareRules/FareInfo");
                                    for (var indexFareInfos = 0; indexFareInfos < nsFareInfos.Count; indexFareInfos++) {
                                        var nodeFareBasisCode = nsFareInfos.GetItem(indexFareInfos).SelectSingle("FareBasisCode");
                                        if (nodeFareBasisCode.GetAttribute("SourceFare"))
                                            nsResponseFareInfos.GetItem(indexFareInfos).SelectSingle("FareBasisCode").SetAttribute("SourceFare", nodeFareBasisCode.GetAttribute("SourceFare"));
                                    }
                                }
                            }
                        }
                    }
                }

                return domFlightPriceRS;
            }
            else {
                TraceText(__file__, "* FLXM pricing rules was not applied successfully", providerFLXM.LastError());
                if (!parameters.domFlightPriceRS.Root.Select("FareGroup/TravelerGroup/Price/Taxes[not(@Amount = 0)]"))
                    throw "180000053";

                return parameters.domFlightPriceRS;
            }
        }
        catch (error) {
            if (this.showTrace) TraceText(__file__, "* FLX-M pricing rules was not applied successfully", error.toString());

            // errors out if purpuse of call included retrieve taxes
            if (!parameters.domFlightPriceRS.Root.Select("FareGroup/TravelerGroup/Price/Taxes[not(@Amount = 0)]"))
                throw "180000053";

            return parameters.domFlightPriceRS;
        }
    };

    /**
     * Checks if request is for services
     * @returns {Boolean}
     */
    this.IsForServices = function() {

        return this.domRequest.Root.SelectSingle("PricingInfo[./@RequestOptions = \"Y\" or ./@PriceServicesOnly = \"Y\"]")? true: false;
    };

    /**
     * Checks if request is for pricing
     * @returns {Boolean}
     */
    this.IsForPricing = function() {

        return this.domRequest.Root.SelectSingle("PricingInfo[./@RequestOptions = \"N\" or ./@Price = \"Y\"]")? true: false;
    };

    /**
     * Checks if request is for pricing post booking
     * @returns {Boolean}
     */
    this.IsPostBooking = function() {

        return this.domRequest.Root.SelectSingle("PNRViewRS")? true: false;
    };

    /**
     * Checks whether goes for pricing or not when Services fails
     * @returns {Boolean}
     */
    this.ForcePricing = function() {

        return this.domRequest.Root.SelectSingle("PricingInfo[./@RequestOptions or ./@Price = \"Y\"]")? true: false;
    };

    /**
     * Checks whether is autoexchange or not
     * @returns {Boolean}
     */
    this.IsAutoExchange = function() {

        return this.domRequest.Root.SelectSingle("PricingInfo[@AutoExchange = \"Y\"]")? true: false;
    };

    /**
     * Stores FlightPriceRS in cache
     * @param {xxDomDocument} domFlightPriceRS
     */
    this.StorePriceInCache = function(domFlightPriceRS) {

        var strCacheKey = CreateCARF();

        TraceXml(__file__, "* Storing pricing response in cache with key " + strCacheKey, domFlightPriceRS.Root.SelectSingle("FareGroup").XML);
        SetCacheData("FareCacheKey", strCacheKey, domFlightPriceRS.Root.SelectSingle("FareGroup").XML);
        domFlightPriceRS.PutNode(domFlightPriceRS.Root.SelectSingle("FareGroup"), "FareCacheKey", strCacheKey);
    };

    /**
     * Returns cached FlightPriceRS
     * @param {String} strCacheKey
     * @returns {String}
     */
    this.GetCachedPrice = function(strCacheKey) {

        var strCachedResponse = GetCacheData("FareCacheKey", strCacheKey);
        if (strCachedResponse)
            TraceXml(__file__, "* Cached pricing response with key " + strCacheKey, strCachedResponse);

        return strCachedResponse;
    };

    this.ReshopCached = function() {
        var travIdNodeCount = this.domRequest.SelectNode(this.domRequest.Root, "TravelerIDs")? this.domRequest.SelectNode(this.domRequest.Root, "TravelerIDs").Count: 0;
        var ticketImageNodeCount = this.domRequest.SelectNode(this.domRequest.Root, "TicketImageRS/TicketImage")? this.domRequest.SelectNode(this.domRequest.Root, "TicketImageRS/TicketImage").Count: 0;
        if((travIdNodeCount != ticketImageNodeCount) && this.domRequest.Root.SelectSingle("PNRViewRS/FareGroup[@AutoExchange = 'Y']/FareCacheKey"))
            return true;

        return false;
    };

    /**
    * Get the TicketImages for the flowns coupons
    * @param flightpricerq
    * @param strTC
    * @constructor
    */
    this.GetTicketImageRS = function(parameters) {
        var allTicketImageDom = new xxDomDocument();
        var domTC = new xxDomDocument();
        if (!domTC.LoadXML(parameters.strTC))
            throw "Cannot load TC";

        var validatingCarrier = parameters.flightpricerq.Root.SelectSingle("PricingInfo/ValidatingCarrier");
        var agencyIATANumber = parameters.flightpricerq.Root.SelectSingle("TicketImageRS/TicketImage/PNRIdentification/AgencyData/IATA");
        if (agencyIATANumber)
            agencyIATANumber = "<Agency>" + agencyIATANumber.NormalizedText + "</Agency>";

        var currpsucity = parameters.flightpricerq.Root.SelectSingle("TicketImageRS/TicketImage/PNRIdentification/CurrentPseudoCityCode");
        if (currpsucity)
            currpsucity = "<CurrentPseudoCityCode>" + currpsucity.NormalizedText + "</CurrentPseudoCityCode>";

        var tktnum = "<TicketNumber Source = '"+ validatingCarrier.NormalizedText +"' >" + parameters.ticketNumber.NormalizedText + "</TicketNumber>";

        var ticketImageRQ = "<TicketImageRQ>" + agencyIATANumber + currpsucity + tktnum + "</TicketImageRQ>";

        var providerTKT = new JsXXServer(domTC);

        var domTicketImageRS = providerTKT.SendTransaction({ strXXServerRequest: ticketImageRQ, endTransaction: true });
        if (!providerTKT.IsFLXMValidErrorResponse() && !providerTKT.IsErrorResponse())
            return domTicketImageRS;
        else
            TraceText(__file__, "Unable to retrieve previously exchanged ticket", providerTKT.LastError());
    };

    this.GetFlownTicketCoupon = function (parameters) {
        var ticketImageRQ = null; 
        var ticketNumbers = parameters.flightpricerq.SelectNode(parameters.flightpricerq.Root, "TicketImageRS/TicketImage/InExchangeFor/TicketNumber");
        var fareRules = parameters.flightpricerq.Root.SelectSingle("TicketImageRS/TicketImage/FareGroup/TravelerGroup/FareRules");
        if (ticketNumbers) {
            for (var tTicket = 0; tTicket < ticketNumbers.Count; tTicket++) {
                var ticketNumber = ticketNumbers.GetItem(tTicket);
                if (ticketNumber) {
                    var tktIden = parameters.flightpricerq.Root.SelectSingle("TicketImageRS/TicketImage[" + (tTicket + 1) + "]/TicketIdentification");
                    var initialIssueDate = parameters.flightpricerq.Root.SelectSingle("TicketImageRS/TicketImage[" + (tTicket + 1) + "]/TicketIdentification/TktIssueDate");
                    //var firstTicketImageRSFlownFlight = GetTicketImageRS({flightpricerq, strTC, ticketNumber);
                    var firstTicketImageRSFlownFlight = this.GetTicketImageRS({ flightpricerq: parameters.flightpricerq, strTC: parameters.strTC, ticketNumber: ticketNumber });
                    if (firstTicketImageRSFlownFlight) {
                        var newTktIssueDate = firstTicketImageRSFlownFlight.Root.SelectSingle("TicketImage/TicketIdentification/TktIssueDate");
                        var fareCal1 = firstTicketImageRSFlownFlight.Root.SelectSingle("TicketImage/FareGroup/TravelerGroup/FareRules/FareCalculation");
                        if (newTktIssueDate && initialIssueDate) {
                            var tktIssueDate = CreateNode({ flightpricerq: parameters.flightpricerq, nodeName: "TktReissueDate", date: initialIssueDate });
                            tktIden.AppendChild(tktIssueDate);

                            if (initialIssueDate)
                                parameters.flightpricerq.PutNode(tktIden, "TktIssueDate", newTktIssueDate.NormalizedText);
                        }

                        var flownTicketCoupons = firstTicketImageRSFlownFlight.SelectNode(firstTicketImageRSFlownFlight.Root, "TicketImage/Itinerary/TicketCoupon[@CouponStatus = 'F']");
                        if (flownTicketCoupons)
                            parameters.flightpricerq = InsertFlownCouponToItinerary({ flightpricerq: parameters.flightpricerq, flownTicketCoupons: flownTicketCoupons, tTicket: tTicket });
                    }
                    ticketNumber = null;
                    if(firstTicketImageRSFlownFlight)
                        ticketNumber = firstTicketImageRSFlownFlight.Root.SelectSingle("TicketImage/InExchangeFor/TicketNumber");
                    if (ticketNumber) {
                        var secondTicketImageRSFlownFlight = this.GetTicketImageRS({ flightpricerq: parameters.flightpricerq, strTC: parameters.strTC, ticketNumber: ticketNumber });
                        if (secondTicketImageRSFlownFlight) {
                            var secTktIssueDate = secondTicketImageRSFlownFlight.Root.SelectSingle("TicketImage/TicketIdentification/TktIssueDate");
                            if (secTktIssueDate) {
                                var tktIssueDate = CreateNode({ flightpricerq: parameters.flightpricerq, nodeName: "TktReissueDate", date: secTktIssueDate });
                                tktIden.AppendChild(tktIssueDate);
                                if (initialIssueDate)
                                    parameters.flightpricerq.PutNode(tktIden, "TktIssueDate", secTktIssueDate.NormalizedText);
                            }
                            var secondFlownTicketCoupons = secondTicketImageRSFlownFlight.SelectNode(secondTicketImageRSFlownFlight.Root, "TicketImage/Itinerary/TicketCoupon[@CouponStatus = 'F']");
                            if (secondFlownTicketCoupons)
                                parameters.flightpricerq = InsertFlownCouponToItinerary({ flightpricerq: parameters.flightpricerq, secondFlownTicketCoupons: secondFlownTicketCoupons, tTicket: tTicket });
                        }
                        ticketNumber = null;
                        if(secondTicketImageRSFlownFlight)
                            ticketNumber = secondTicketImageRSFlownFlight.Root.SelectSingle("TicketImage/InExchangeFor/TicketNumber");
                        if (ticketNumber) {
                            var thirdTicketImageRSFlownFlight = this.GetTicketImageRS({ flightpricerq: parameters.flightpricerq, strTC: parameters.strTC, ticketNumber: ticketNumber });
                            if (thirdTicketImageRSFlownFlight) {
                                var thiTktIssueDate = thirdTicketImageRSFlownFlight.Root.SelectSingle("TicketImage/TicketIdentification/TktIssueDate");
                                if (thiTktIssueDate) {
                                    if (initialIssueDate)
                                        parameters.flightpricerq.PutNode(tktIden, "TktIssueDate", thiTktIssueDate.NormalizedText);
                                }
                                var thirdFlownTicketCoupons = thirdTicketImageRSFlownFlight.SelectNode(thirdTicketImageRSFlownFlight.Root, "TicketImage/Itinerary/TicketCoupon[@CouponStatus = 'F']");
                                if (thirdFlownTicketCoupons)
                                    parameters.flightpricerq = InsertFlownCouponToItinerary({ flightpricerq: parameters.flightpricerq, thirdFlownTicketCoupons: thirdFlownTicketCoupons, tTicket: tTicket });
                            }
                            ticketNumber = null;
                            if(thirdTicketImageRSFlownFlight)
                                ticketNumber = thirdTicketImageRSFlownFlight.Root.SelectSingle("TicketImage/InExchangeFor/TicketNumber");
                            if (ticketNumber)
                                throw "180002082";
                        }
                    }
                }
            }
            CreateFlownFlightNode({ flightpricerq: parameters.flightpricerq });
            TraceXml(__file__, "After Retrieved Flown Coupons", parameters.flightpricerq.XML);
        }

        return parameters.flightpricerq;
    };

    function InsertFlownCouponToItinerary(parameters) {
        for (var fCoupons = (parameters.flownTicketCoupons.Count - 1); fCoupons >= 0; fCoupons--) {
            var coupon = parameters.flownTicketCoupons.GetItem(fCoupons);
            if (coupon) {
                var itinerary = parameters.flightpricerq.Root.SelectSingle("TicketImageRS/TicketImage[" + (parameters.tTicket + 1) + "]/Itinerary");
                if (itinerary)
                    itinerary.FirstChild.InsertBefore(coupon.Clone());
            }
        }
        return parameters.flightpricerq;
    }

    /**
    * Creates the Flight node in the OriginDestination for the Flown Coupons
    * @param flightpricerq
    * @constructor
    */
    function CreateFlownFlightNode(parameters) {
        var flownTicketCoupon = parameters.flightpricerq.SelectNode(parameters.flightpricerq.Root, "TicketImageRS/TicketImage[1]/Itinerary/TicketCoupon[@CouponStatus = 'F']");
        if (flownTicketCoupon) {
            for (var fCoupons = (flownTicketCoupon.Count - 1); fCoupons >= 0; fCoupons--) {
                var coupon = flownTicketCoupon.GetItem(fCoupons);
                if (coupon) {
                    var flightNode = coupon.SelectSingle("Flight");
                    var couponNumber = coupon.GetAttribute("CouponNumber");
                    if (flightNode) {
                        var ODFlight = parameters.flightpricerq.CreateElementNode("Flight");
                        ODFlight.SetAttribute("Type", "F");

                        if(couponNumber)
                            ODFlight.SetAttribute("rph", (Number(couponNumber) -1).toString());
                        var airlineCode = flightNode.SelectSingle("Carrier/AirlineCode");
                        var flightNumber = flightNode.SelectSingle("Carrier/FlightNumber");
                        var cos = flightNode.SelectSingle("ClassOfService");
                        var equipment = flightNode.SelectSingle("Equipment");
                        var dep = flightNode.SelectSingle("Departure");
                        var arr = flightNode.SelectSingle("Arrival");

                        var flightFromRequest = parameters.flightpricerq.Root.SelectSingle("OriginDestination/Flight[FlightNumber = '" + flightNumber.NormalizedText + "' and AirlineCode = '" + airlineCode.NormalizedText + "' and ClassOfService = '" + cos.NormalizedText +"' and Departure = '" + dep.NormalizedText +"' and Arrival = '" + arr.NormalizedText +"'][@Type = 'F']");
                        var unFlownFlightFromRequest = parameters.flightpricerq.Root.SelectSingle("OriginDestination/Flight[FlightNumber = '" + flightNumber.NormalizedText + "' and AirlineCode = '" + airlineCode.NormalizedText +"'][not(@Type)]");
                        if (!flightFromRequest) {
                            if (airlineCode)
                                ODFlight.AppendChild(airlineCode.Clone());
                            if (flightNumber)
                                ODFlight.AppendChild(flightNumber.Clone());
                            if (cos)
                                ODFlight.AppendChild(cos.Clone());
                            if (equipment)
                                ODFlight.AppendChild(equipment.Clone());
                            if (dep)
                                ODFlight.AppendChild(dep.Clone());
                            if (arr)
                                ODFlight.AppendChild(arr.Clone());

                            var OriDesNode = parameters.flightpricerq.CreateElementNode("OriginDestination");
                            if (OriDesNode) {
                                OriDesNode.AppendChild(ODFlight);
                                parameters.flightpricerq.Root.FirstChild.InsertBefore(OriDesNode);
                            }
                            if(unFlownFlightFromRequest)
                                unFlownFlightFromRequest.Delete();
                        }

                    }
                }

            }
        }
        var emptyOD = parameters.flightpricerq.SelectNode(parameters.flightpricerq.Root, "OriginDestination[not(Flight)]");
        if(emptyOD){
            for (var odCounter = 0; odCounter < emptyOD.Count; odCounter++) {
                var od = emptyOD.GetItem(odCounter);
                if (od)
                    od.Delete();
            }
        }
    }

    function CreateNode(parameters) {
        var node = parameters.flightpricerq.CreateElementNode(parameters.nodeName);
        var nodeText = parameters.flightpricerq.CreateTextNode(parameters.date.NormalizedText);
        node.AppendChild(nodeText);
        return node;
    }

    /**
     * Calculates the Forfeited Basefare
     * @param domFlightPriceRS
     * @param domRequest
     * @param forfeitTaxAmount
     * @param forfeitBaseFareAmount
     * @returns {xxDomDocument}
     */
    function CalculateForfeitAmount(parameters) {
        var lookup = GetLookupDirectory();
        var path = lookup + GetLookupFileName(parameters.domTC) + ".xml";
        var Country = parameters.domTC.Root.SelectSingle("ACLInfo/Country")? parameters.domTC.Root.SelectSingle("ACLInfo/Country").NormalizedText: "";
        var lookupFile = LoadFile(path);

        var PenaltyInResidualFare_Flag = "Y";
        var PenaltyInResidualTaxes_Flag = "Y";
        var AllowForfeitBSPExchange_Flag = "N";
        var AllowResidualTaxesInADCTaxes_Flag = "Y";
        var AllowHigherTaxesInResidual_Flag = "Y";
        var ForfeitBSPExchange_Fare_Flag = "N";
        var ForfeitBSPExchange_Tax_Flag = "N";
        var ForfeitAutoFare_Flag = "N";

        var exchange = null;
        var validatingCarrier = parameters.domRequest.Root.SelectSingle("PricingInfo/ValidatingCarrier") ? parameters.domRequest.Root.SelectSingle("PricingInfo/ValidatingCarrier").NormalizedText : parameters.domRequest.Root.SelectSingle("PNRViewRS/FareGroup/ValidatingCarrier").NormalizedText;
        var lookupDom = new xxDomDocument();
        if (!lookupDom.LoadXML(lookupFile))
            throw "Unable to load lookupDom";

        else {
            var Exchange_Flags = lookupDom.SelectSingle(lookupDom.Root, "ce[code = '" + Country + "']/data/ValidatingCarrier[@Cxr = '" + validatingCarrier + "']/Exchange");
            if (!Exchange_Flags)
                Exchange_Flags = lookupDom.SelectSingle(lookupDom.Root, "ce[code = 'DEFAULT']/data/ValidatingCarrier[@Cxr = '" + validatingCarrier + "']/Exchange");
            if (!Exchange_Flags)
                Exchange_Flags = lookupDom.SelectSingle(lookupDom.Root, "ce[code = 'DEFAULT']/data/ValidatingCarrier[@Cxr = 'YY']/Exchange");
            if (Exchange_Flags) {
                PenaltyInResidualFare_Flag = Exchange_Flags.SelectSingle("PenaltyInResidualFare") ? Exchange_Flags.SelectSingle("PenaltyInResidualFare").NormalizedText : PenaltyInResidualFare_Flag;
                PenaltyInResidualTaxes_Flag = Exchange_Flags.SelectSingle("PenaltyInResidualTaxes") ? Exchange_Flags.SelectSingle("PenaltyInResidualTaxes").NormalizedText : PenaltyInResidualTaxes_Flag;
                AllowForfeitBSPExchange_Flag = Exchange_Flags.SelectSingle("Forfeit/ForfeitBSPExchange") ? Exchange_Flags.SelectSingle("Forfeit/ForfeitBSPExchange").NormalizedText : AllowForfeitBSPExchange_Flag;
                AllowResidualTaxesInADCTaxes_Flag = Exchange_Flags.SelectSingle("ResidualTaxesInADCTaxes") ? Exchange_Flags.SelectSingle("ResidualTaxesInADCTaxes").NormalizedText : AllowResidualTaxesInADCTaxes_Flag;
                AllowHigherTaxesInResidual_Flag = Exchange_Flags.SelectSingle("HigherTaxesInResidual") ? Exchange_Flags.SelectSingle("HigherTaxesInResidual").NormalizedText : AllowHigherTaxesInResidual_Flag;

                ForfeitBSPExchange_Fare_Flag = Exchange_Flags.SelectSingle("Forfeit/ForfeitBSPExchange/@AutoFare") ? Exchange_Flags.SelectSingle("Forfeit/ForfeitBSPExchange").GetAttribute("AutoFare") : ForfeitBSPExchange_Fare_Flag;
                ForfeitBSPExchange_Tax_Flag = Exchange_Flags.SelectSingle("Forfeit/ForfeitBSPExchange/@Taxes") ? Exchange_Flags.SelectSingle("Forfeit/ForfeitBSPExchange").GetAttribute("Taxes") : ForfeitBSPExchange_Tax_Flag;
                ForfeitBSPExchang_Flag = Exchange_Flags.SelectSingle("Forfeit/ForfeitBSPExchange") ? Exchange_Flags.SelectSingle("Forfeit/ForfeitBSPExchange").GetAttribute("AutoFare") : ForfeitAutoFare_Flag;
            }
        }
        if (AllowForfeitBSPExchange_Flag == "Y" || (ForfeitBSPExchang_Flag == "Y" && (ForfeitBSPExchange_Fare_Flag == "Y" || ForfeitBSPExchange_Tax_Flag == "Y"))) { 
            var nsTravelergroup = parameters.domFlightPriceRS.SelectNode(parameters.domFlightPriceRS.Root, "FareGroup/TravelerGroup");
            if (nsTravelergroup != null) {
                for (var itravgroup = 0; itravgroup < nsTravelergroup.Count; itravgroup++) {
                    var travGroup = nsTravelergroup.GetItem(itravgroup);
                    if (travGroup) {
                        var forfeitBaseFareAmount = parameters.forfeitBaseFareAmount;
                        var forfeitTaxAmount = parameters.forfeitTaxAmount;
                        exchange = travGroup.SelectSingle("ExchangeInfo");
                        if (AllowResidualTaxesInADCTaxes_Flag == "Y" || ForfeitBSPExchange_Tax_Flag == "Y") {
                            //Add the Unused taxes
                            var unUsedTaxNodes = parameters.domFlightPriceRS.SelectNode(parameters.domFlightPriceRS.Root, "FareGroup/TravelerGroup/Price/Taxes/Tax[@Paid != 'RF' and @Paid != 'PD']");
                            var unUsedTaxAmount = 0;
                            if (unUsedTaxNodes) {
                                for (var unusedTax = 0; unusedTax < unUsedTaxNodes.Count; unusedTax++) {
                                    var tax = unUsedTaxNodes.GetItem(unusedTax);
                                    if (tax) {
                                        var unUsedAmount = tax.GetAttribute("Amount");
                                        if (unUsedAmount)
                                            unUsedTaxAmount += Number(unUsedAmount);
                                    }
                                }
                                TraceXml("unUsedTaxAmount", "unUsedTaxAmount", unUsedTaxAmount.toString());
                                forfeitTaxAmount = Math.abs(forfeitTaxAmount.toString()) - Number(unUsedTaxAmount);
                            }
                        }
                        if (exchange) {
                            var exchPenalty = exchange.SelectSingle("Penalty");
                            var oldTicket = exchange.SelectSingle("ValueOfOldTicket");
                            var forfeitTotalamount = oldTicket.GetAttribute("ForfeitFareAmount")? Number(oldTicket.GetAttribute("ForfeitFareAmount")) : 0;
                            if (!exchPenalty) {
                                if (oldTicket) {
                                    if (forfeitBaseFareAmount) {
                                        if (ForfeitBSPExchange_Fare_Flag == "Y")
                                            forfeitTotalamount = Math.abs(forfeitTotalamount) + Math.abs(forfeitBaseFareAmount.toString());
                                        //oldTicket.SetAttribute("ForfeitFareAmount", Math.abs(forfeitBaseFareAmount.toString()));
                                    }
                                    if (forfeitTaxAmount > 0) {
                                        if (ForfeitBSPExchange_Tax_Flag == "Y")
                                            forfeitTotalamount = Math.abs(forfeitTotalamount) + Math.abs(forfeitTaxAmount.toString());
                                        //oldTicket.SetAttribute("ForfeitTaxAmount", Math.abs(forfeitTaxAmount.toString()));
                                    }
                                }
                            }
                            else {

                                var adjPenalty = 0;
                                var totalResidual = 0;
                                var basefareResidual = 0;
                                var taxResidual = 0;
                                var penaltyAmount = exchPenalty.GetAttribute("Amount");
                                var penaltyTotal = exchPenalty.GetAttribute("Total");
                                var currNode = exchange.SelectSingle("CurrencyCode");
                                var currDec = 0;
                                var zeroAmount = 0;

                                if (currNode)
                                    currDec = currNode.GetAttribute("NumberOfDecimals");
                                if (PenaltyInResidualFare_Flag == "Y") {
                                    if (forfeitBaseFareAmount != 0) {
                                        if (penaltyAmount) {
                                            basefareResidual = Math.abs(forfeitBaseFareAmount.toString()) - penaltyAmount;
                                            if (basefareResidual <= 0) {
                                                exchPenalty.SetAttribute("Amount", Math.abs(basefareResidual.toString()));
                                                forfeitTotalamount = (zeroAmount.toFixed(Number(currDec))).toString().replace(".", "");
                                                // oldTicket.SetAttribute("ForfeitFareAmount", Math.abs(basefareResidual.toString()));

                                            }
                                            else {
                                                exchPenalty.SetAttribute("Amount", (zeroAmount.toFixed(Number(currDec))).toString().replace(".", ""));
                                                forfeitTotalamount = Math.abs(forfeitTotalamount) + Math.abs(basefareResidual.toString());
                                            }
                                        }
                                    }
                                }
                                else {
                                    // oldTicket.SetAttribute("ForfeitFareAmount", Math.abs(forfeitBaseFareAmount.toString()));
                                    if (ForfeitBSPExchange_Fare_Flag == "Y")
                                        forfeitTotalamount = Math.abs(forfeitBaseFareAmount.toString());
                                }
                                if (PenaltyInResidualTaxes_Flag == "Y") {
                                    oldTicket.SetAttribute("AllowPenaltyInResidualTaxes", "Y");
                                    if (forfeitTaxAmount > 0) {
                                        var newPenalty = exchPenalty.GetAttribute("Amount");
                                        if (newPenalty) {
                                            if (newPenalty != 0) {
                                                taxResidual = Math.abs(forfeitTaxAmount.toString()) - newPenalty;
                                                if (taxResidual < 0) {
                                                    exchPenalty.SetAttribute("Amount", Math.abs(taxResidual.toString()));
                                                    //oldTicket.SetAttribute("ForfeitTaxAmount", Math.abs(taxResidual.toString()));
                                                    forfeitTotalamount = (zeroAmount.toFixed(Number(currDec))).toString().replace(".", "");
                                                }
                                                else {
                                                    exchPenalty.SetAttribute("Amount", (zeroAmount.toFixed(Number(currDec))).toString().replace(".", ""));
                                                    forfeitTotalamount = Math.abs(forfeitTotalamount) + Math.abs(taxResidual.toString());
                                                }

                                            }
                                            else {
                                                // oldTicket.SetAttribute("ForfeitTaxAmount", Math.abs(forfeitTaxAmount.toString()));
                                                if (ForfeitBSPExchange_Tax_Flag == "Y")
                                                    forfeitTotalamount = Math.abs(forfeitTotalamount) + Math.abs(forfeitTaxAmount.toString());
                                            }
                                        }
                                        else {
                                            // oldTicket.SetAttribute("ForfeitTaxAmount", Math.abs(forfeitTaxAmount.toString()));
                                            if (ForfeitBSPExchange_Tax_Flag == "Y")
                                                forfeitTotalamount = Math.abs(forfeitTotalamount) + Math.abs(forfeitTaxAmount.toString());
                                        }
                                    }
                                }
                                else {
                                    //oldTicket.SetAttribute("ForfeitTaxAmount", Math.abs(forfeitTaxAmount.toString()));
                                    if (ForfeitBSPExchange_Tax_Flag == "Y")
                                        forfeitTotalamount = Math.abs(forfeitTotalamount) + Math.abs(forfeitTaxAmount.toString());
                                }
                                exchPenalty.SetAttribute("Amount", penaltyAmount.toString());
                            }
                            if (forfeitTotalamount >= 0)
                                oldTicket.SetAttribute("ForfeitTotalAmount", forfeitTotalamount.toString());
                            if (forfeitBaseFareAmount >= 0 && (PenaltyInResidualFare_Flag == "Y" || ForfeitBSPExchange_Fare_Flag == "Y") && !(oldTicket.GetAttribute("ForfeitFareAmount")))
                                oldTicket.SetAttribute("ForfeitFareAmount", forfeitBaseFareAmount.toString());
                            if (forfeitTaxAmount >= 0 && (PenaltyInResidualTaxes_Flag == "Y" || ForfeitBSPExchange_Tax_Flag == "Y"))
                                oldTicket.SetAttribute("ForfeitTaxAmount", forfeitTaxAmount.toString());

                            if (oldTicket) {
                                oldTicket.SetAttribute("AllowPenaltyInResidualFare", PenaltyInResidualFare_Flag.toString());
                                oldTicket.SetAttribute("AllowPenaltyInResidualTaxes", PenaltyInResidualTaxes_Flag.toString());
                                if(!oldTicket.GetAttribute("AllowForfeitBSPExchange"))
                                    oldTicket.SetAttribute("AllowForfeitBSPExchange", AllowForfeitBSPExchange_Flag.toString());
                                oldTicket.SetAttribute("AllowResidualTaxesInADCTaxes", AllowResidualTaxesInADCTaxes_Flag.toString());
                                oldTicket.SetAttribute("AllowHigherTaxesInResidual", AllowHigherTaxesInResidual_Flag.toString());
                                oldTicket.SetAttribute("AllowForfeitBSPExchange-Fare", ForfeitBSPExchange_Fare_Flag.toString());
                                oldTicket.SetAttribute("AllowForfeitBSPExchange-Tax", ForfeitBSPExchange_Tax_Flag.toString());
                            }
                        }
                    }

                }
            }
        }
        return parameters.domFlightPriceRS;
    }

     this.CalculateAddCollectTaxes = function(parameters) {
        var arcMarket = parameters.domTC.Root.SelectSingle("ACLInfo/TktReporting");
        var travGroupNodes = parameters.domFlightPriceRS.SelectNode(parameters.domFlightPriceRS.Root, "FareGroup/TravelerGroup");
        if(travGroupNodes)
        {
            for(var iTrav=0; iTrav < travGroupNodes.Count; iTrav++)
            {
                var travGroup = travGroupNodes.GetItem(iTrav);
                if (travGroup) {
                    var priceNode;
                    var paxTicketImageTaxes = null;
                    var paxTicketImageBaseFareAmount = null;
                    var basefareAmount = null;
                    var forfeitTaxAmount = 0;
                    var forfeitBaseFareAmount = 0;

                    var travelerIdRef = travGroup.ValueOfSelect("TravelerIDRef");
                    var paxType = travGroup.GetAttribute("TypeRequested");
                    if(travelerIdRef || paxType) {
                        var paxTicketImaPriceNode;
                        if(travelerIdRef)
                            paxTicketImaPriceNode = parameters.domRequest.Root.SelectSingle("TicketImageRS/TicketImage/FareGroup/TravelerGroup[TravelerElementNumber = '" + travelerIdRef + "']/Price");
                        if(!paxTicketImaPriceNode){
                            paxTicketImaPriceNode = parameters.domRequest.SelectSingle(parameters.domRequest.Root, "TicketImageRS/TicketImage/FareGroup/TravelerGroup[@TypeRequested = '" + paxType + "']/Price");
                        }
                        if(paxTicketImaPriceNode) {
                            paxTicketImageTaxes = parameters.domRequest.SelectSingle(paxTicketImaPriceNode, "Taxes");
                            if(paxTicketImageTaxes) {
                                var tktImageTaxNodes = parameters.domRequest.SelectNode(paxTicketImageTaxes, "Tax");
                                if(tktImageTaxNodes) {
                                    for(var iTax=0; iTax < tktImageTaxNodes.Count; iTax++) {
                                        var tax = tktImageTaxNodes.GetItem(iTax);
                                        if (tax) {
                                            // groups elements of the same tax
                                            var nsTax;
                                            if (!tax.SelectSingle("CollectionPoint")) {
                                                if (tax.SelectSingle("TaxType"))
                                                    nsTax = travGroup.Select("Price/Taxes/Tax[Designator = '" + tax.SelectSingle("Designator").NormalizedText + "' and TaxType = '" + tax.SelectSingle("TaxType").NormalizedText + "']");
                                                else
                                                    nsTax = travGroup.Select("Price/Taxes/Tax[Designator = '" + tax.SelectSingle("Designator").NormalizedText + "' and not(TaxType)]");
                                            }
                                            if(nsTax) {
                                                var nodeTax = nsTax.GetItem(0);
                                                var totalLocalAmount = Number(nodeTax.ValueOfSelect("LocalAmount"));
                                                if (nsTax.Count > 1) {
                                                    for (var indexTax = 1; indexTax < nsTax.Count; indexTax++) {
                                                        nodeTax.SetAttribute("Amount", Number(nodeTax.GetAttribute("Amount")) + Number(nsTax.GetItem(indexTax).GetAttribute("Amount")));
                                                        var nsCollectionPoint = nsTax.GetItem(indexTax).Select("CollectionPoint");
                                                        totalLocalAmount += Number(nsTax.GetItem(indexTax).ValueOfSelect("LocalAmount"));
                                                        if (nsCollectionPoint)
                                                            for (var indexCollectionPoint = 0; indexCollectionPoint < nsCollectionPoint.Count; indexCollectionPoint++)
                                                                nodeTax.AppendChild(nsCollectionPoint.GetItem(indexCollectionPoint));
                                                        nsTax.GetItem(indexTax).Delete();
                                                    }
                                                    if(totalLocalAmount > 0) {
                                                        var nodeLocalAmount = parameters.domFlightPriceRS.CreateElementNode("LocalAmount");
                                                        nodeLocalAmount.AppendChild(parameters.domFlightPriceRS.CreateTextNode(totalLocalAmount.toString()));
                                                        nodeTax.SelectSingle("LocalAmount").InsertAfter(nodeLocalAmount);
                                                        nodeTax.SelectSingle("LocalAmount").Delete();
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            var paxTicketImageBaseFare = paxTicketImaPriceNode.SelectSingle("BaseFare");
                            if(paxTicketImageBaseFare)
                                paxTicketImageBaseFareAmount = paxTicketImageBaseFare.GetAttribute("Amount");
                        }
                        var taxesNode = travGroup.SelectSingle("Price/Taxes");
                        priceNode = travGroup.SelectSingle("Price");
                        if(priceNode)
                        {
                            var basefare = priceNode.SelectSingle("BaseFare");
                            if(basefare)
                            {
                                basefareAmount = basefare.GetAttribute("Amount");
                                if(basefareAmount && paxTicketImageBaseFareAmount)
                                    forfeitBaseFareAmount = paxTicketImageBaseFareAmount - basefareAmount;
                                if(forfeitBaseFareAmount < 0)
                                    forfeitBaseFareAmount = 0;
                            }
                        }
                        TraceXml("forfeitBaseFareAmount", "forfeitBaseFareAmount", forfeitBaseFareAmount);
                        if(taxesNode)
                        {
                            var taxNodes = parameters.domFlightPriceRS.SelectNode(taxesNode, "Tax");
                            // var paidTaxes = parameters.domFlightPriceRS.SelectNode(taxesNode, "Tax[@Paid]");
                            var rfTaxes = parameters.domFlightPriceRS.SelectNode(taxesNode, "Tax[@Paid = 'RF']");
                            if(taxNodes)
                            {
                                for(var iTax=0; iTax < taxNodes.Count; iTax++)
                                {
                                    var thisTax = taxNodes.GetItem(iTax);
                                    if (thisTax)
                                    {
                                        var taxAmount = thisTax.GetAttribute("Amount");
                                        var designator = thisTax.SelectSingle("Designator");
                                        if(paxTicketImageTaxes)
                                        {
                                            if(taxAmount && designator)
                                            {
                                                var tktImageTax;
                                                if(thisTax.SelectSingle("CollectionPoint"))
                                                    tktImageTax = parameters.domFlightPriceRS.SelectNode(paxTicketImageTaxes, "Tax[not(@TaxInPreviousTicket) and Designator = '" + designator.NormalizedText + "' and (CollectionPoint/AirportCode = '" + thisTax.SelectSingle("CollectionPoint/AirportCode").NormalizedText + "' or not(CollectionPoint))]");
                                                else if (thisTax.SelectSingle("TaxType"))
                                                    tktImageTax = parameters.domFlightPriceRS.SelectNode(paxTicketImageTaxes, "Tax[not(@TaxInPreviousTicket) and TaxType = '" + thisTax.SelectSingle("TaxType").NormalizedText + "' and Designator = '" + designator.NormalizedText + "']");
                                                else
                                                    tktImageTax = parameters.domFlightPriceRS.SelectNode(paxTicketImageTaxes, "Tax[not(@TaxInPreviousTicket) and Designator = '" + designator.NormalizedText + "']");
                                                if(tktImageTax)
                                                {
                                                    var oldTaxAmount = AddOldTaxAmounts(tktImageTax);
                                                    if(oldTaxAmount)
                                                    {
                                                        if(taxAmount == oldTaxAmount && (arcMarket.NormalizedText == "BSP" || this.IsAppSettingEnabled("NDCExternalExchangeCalc")))
                                                            thisTax.SetAttribute("Paid", "PD");
                                                        else
                                                        {
                                                            var taxDiff = taxAmount - oldTaxAmount;
                                                            if(taxDiff)
                                                            {
                                                                if(taxDiff > 0)
                                                                {
                                                                    AddTaxNode(parameters.domFlightPriceRS, "Tax", thisTax, taxDiff.toString(), null);
                                                                    thisTax.SetAttribute("Amount", oldTaxAmount);
                                                                    if(arcMarket.NormalizedText == "BSP" || this.IsAppSettingEnabled("NDCExternalExchangeCalc"))
                                                                        thisTax.SetAttribute("Paid", "PD");
                                                                }
                                                                else if(taxDiff < 0)
                                                                {
                                                                    taxDiff = Math.abs(taxDiff);
                                                                    AddTaxNode(parameters.domFlightPriceRS, "Tax", thisTax, taxDiff.toString(), "RF");
                                                                    if(arcMarket.NormalizedText == "BSP" || this.IsAppSettingEnabled("NDCExternalExchangeCalc"))
                                                                        thisTax.SetAttribute("Paid", "PD");
                                                                    forfeitTaxAmount += Math.abs(taxDiff);
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                var moreForfeitedTaxNodes = parameters.domRequest.SelectNode(paxTicketImageTaxes, "Tax[not(@TaxInPreviousTicket)]");
                                if(moreForfeitedTaxNodes)
                                {
                                    for(var mTax=0; mTax < moreForfeitedTaxNodes.Count; mTax++) {
                                        var currentTax = moreForfeitedTaxNodes.GetItem(mTax);
                                        if (currentTax) {
                                            var amount = currentTax.GetAttribute("Amount");
                                            if(amount) {
                                                forfeitTaxAmount = Math.abs(forfeitTaxAmount) + Number(amount);
                                                if(currentTax.GetAttribute("Paid") != 'RF'){
                                                    var taxClone = currentTax.Clone();
                                                    if(taxClone){
                                                        taxClone.SetAttribute("Paid", "RF");
                                                        taxesNode.AppendChild(taxClone);
                                                    }
                                                }
                                            }

                                        }
                                    }
                                }
                            }
                            else if(rfTaxes) {
                                for(var iTax=0; iTax < rfTaxes.Count; iTax++) {
                                    var thisTax = rfTaxes.GetItem(iTax);
                                    if (thisTax) {
                                        var amount = thisTax.GetAttribute("Amount");
                                        if(amount)
                                            forfeitTaxAmount = Math.abs(forfeitTaxAmount) + Number(amount);
                                    }
                                }
                            }
                            var  domFlightPriceRSMod= CalculateForfeitAmount({domFlightPriceRS: parameters.domFlightPriceRS, domRequest: parameters.domRequest, forfeitTaxAmount: forfeitTaxAmount, forfeitBaseFareAmount: forfeitBaseFareAmount, domTC: parameters.domTC});

                            var totalTaxAmount = 0;
                            var newPriceAmount = 0;
                            var newTaxNodes = domFlightPriceRSMod.SelectNode(taxesNode, "Tax[@Paid != 'RF']");
                            if(newTaxNodes)
                            {
                                for(var iTax=0; iTax < newTaxNodes.Count; iTax++)
                                {
                                    var newTax = newTaxNodes.GetItem(iTax);
                                    if (newTax)
                                    {
                                        var taxAmount = newTax.GetAttribute("Amount");
                                        if(taxAmount)
                                            totalTaxAmount += Number(taxAmount);
                                    }
                                }
                            }
                            taxesNode.SetAttribute("Amount", totalTaxAmount.toString());

                            if(basefareAmount)
                                newPriceAmount = Number(basefareAmount) + Number(totalTaxAmount);

                            priceNode.SetAttribute("Total", newPriceAmount.toString());
                        }
                    }
                }
            }
        }
        return domFlightPriceRSMod;
    };

    function AddTaxNode(dom, nodeName, n, strValue, paidValue)
    {
        var node = n.Clone();
        if(n)
        {
            node.SetAttribute("Amount", strValue);
            if(paidValue != null)
                node.SetAttribute("Paid", paidValue);
            n.InsertAfter(node);
        }
    }

    function AddOldTaxAmounts(tktImageTax){
        var oldTaxAmount = 0;
        if(tktImageTax.XML){
            oldTaxAmount += Number(tktImageTax.GetAttribute("Amount"));
            tktImageTax.SetAttribute("TaxInPreviousTicket", "Y");
        }
        else{
            for(var taxCounter = 0; taxCounter < tktImageTax.Count; taxCounter++){
                var tax = tktImageTax.GetItem(taxCounter);
                if (tax){
                    oldTaxAmount += Number(tax.GetAttribute("Amount"));
                    tax.SetAttribute("TaxInPreviousTicket", "Y");
                }
            }
        }
        return oldTaxAmount;
    }

    /**
     * Reads lookup file to calculate the Forfeited values
     * @returns {xxDomDocument}
     */
    function GetLookupFileName(domTC) {
        var fileName;
        var session = domTC.Root.SelectSingle("provider").GetAttribute("session")? domTC.Root.SelectSingle("provider").GetAttribute("session"): "";
        if(session != "PROD")
            fileName = "Ticket_Calculation_qastg";
        else
            fileName = "Ticket_Calculation";
        return fileName;
    }

    /**
     * Builds DC availability request
     * @param {JsDCFlightPrice} flightPrice
     * @returns {String}
     */
    function BuildAirAvailabilityRQ(flightPrice) {

        if (flightPrice.showTrace) TraceXml(__file__, "* AirAvailabilityRQ input", flightPrice.domRequest.XML);
        var strAirAvailabilityRQ = flightPrice.xslt.Transform("jsCore/xslt/FLXFlightPriceRQ_FLXAirAvailablityRQ.xsl", flightPrice.domRequest.XML);
        if (!strAirAvailabilityRQ)
            throw "144#Could not transform request.";
        if (flightPrice.showTrace) TraceXml(__file__, "* AirAvailabilityRQ output", strAirAvailabilityRQ);

        return strAirAvailabilityRQ;
    }

    /**
     * Gets DC Availability
     */
    this.GetAvailability = function () {

        var strAvailabilityRQ = BuildAirAvailabilityRQ(this);

        var providerDC = new JsXXServer(this.domTC);
        var domAvailabilityRS = providerDC.SendTransaction({strXXServerRequest: strAvailabilityRQ, endTransaction: true});

        var nsFlights = this.domRequest.SelectNodes(this.domRequest.Root, "OriginDestination/Flight[not(@Type = 'F')]");
        for (var indexFlight = 0; indexFlight < nsFlights.Count; indexFlight++) {

            var nodeFlight = nsFlights.GetItem(indexFlight);
            var nodeFlightNumber = nodeFlight.SelectSingle("FlightNumber");

            var nodeAvailabilitySegment = domAvailabilityRS.Root.SelectSingle("OriginDestination/Flight/Segment[./Departure/AirportCode = '" + nodeFlight.SelectSingle("Departure/AirportCode").NormalizedText +
                "' and ./Departure/Date = '" + nodeFlight.SelectSingle("Departure/Date").NormalizedText + "' and ./Arrival/AirportCode = '" + nodeFlight.SelectSingle("Arrival/AirportCode").NormalizedText +
                "' and number(./Carrier/FlightNumber) = '" + Number(nodeFlightNumber.NormalizedText) + "']");

            if (nodeAvailabilitySegment) {
                if ((this.domRequest.Root.SelectSingle("PricingInfo").GetAttribute("BestPricing") == "Y") && nodeFlight.SelectSingle("Cabin")) {
                    var nsClasses = domAvailabilityRS.SelectNodes(nodeAvailabilitySegment, "Classes/ClassOfService");
                    // adds AllClasses element
                    var nodeAllClasses = this.domRequest.PutNode(nodeFlight, "AllClasses");
                    nodeAllClasses.AppendChildren(nsClasses);

                    // filters the RBDs per Cabin
                    var strClassesInCabin = GetClassesByCabin({domRequest: this.domRequest, nodeFlight: nodeFlight});
                    if (nsClasses && strClassesInCabin)
                        for (var indexClasses = 0; indexClasses < nsClasses.Count; indexClasses++)
                            if (strClassesInCabin.indexOf(nsClasses.GetItem(indexClasses).NormalizedText) < 0)
                                nsClasses.GetItem(indexClasses).Delete();
                }

                nodeFlight.AppendChild(nodeAvailabilitySegment.SelectSingle("Classes").Clone());

                // adds the StopInformation
                if (nodeAvailabilitySegment.SelectSingle("StopInformation"))
                    nodeFlight.AppendChild(nodeAvailabilitySegment.SelectSingle("StopInformation").Clone());

                // updates NumberOfStops value
                var nodeAvailabilityNumberOfStops = nodeAvailabilitySegment.SelectSingle("NumberOfStops");
                var nodeRequestNumberOfStops = nodeFlight.SelectSingle("NumberOfStops");
                if (nodeAvailabilityNumberOfStops) {
                    if (nodeRequestNumberOfStops)
                        nodeRequestNumberOfStops.ReplaceText({domXML: this.domRequest, strValue: nodeAvailabilityNumberOfStops.NormalizedText});
                    else
                        this.domRequest.PutNode(nodeFlight, "NumberOfStops", nodeAvailabilityNumberOfStops.NormalizedText);
                }

                // adds the OperatingCarrier
                if (!nodeFlight.SelectSingle("OperatingCarrier") && nodeAvailabilitySegment.SelectSingle("OperatingCarrier"))
                    nodeFlight.AppendChild(nodeAvailabilitySegment.SelectSingle("OperatingCarrier").Clone());

                nodeAvailabilitySegment.SetAttribute("rph", nodeFlight.GetAttribute("rph"));
            }
            else
                throw "180002078#Invalid Availability response.";
        }
    };

    /**
     * Builds ServiceList request
     * @returns {String}
     */
    this.BuildServiceListRQ = function () {

        // adds the Cabin to the Flights
        var nsFlights = this.domRequest.SelectNodes(this.domRequest.Root, "OriginDestination/Flight[not(Cabin)]");
        if (nsFlights)
            for (var indexFlight = 0; indexFlight < nsFlights.Count; indexFlight++)
                this.domRequest.PutNode(nsFlights.GetItem(indexFlight), "Cabin", GetCabinByClass({domRequest: this.domRequest, nodeFlight: nsFlights.GetItem(indexFlight), airlineId: this.airlineId, showTrace: this.showTrace}));

        this.domRequest.Root.SetAttribute("segmentBasedServiceList", this.segmentBasedServiceList);

        if (this.showTrace) TraceXml(__file__, "* ServiceListRQ input", this.domRequest.XML);
        var strServiceListRQ = this.xslt.Transform("jsCore/xslt/FLXFlightPriceRQ_FLXMServiceListRQ.xsl", this.domRequest.XML);
        if (!strServiceListRQ)
            throw "144#Could not transform request.";
        if (this.showTrace) TraceXml(__file__, "* ServiceListRQ output", strServiceListRQ);

        return strServiceListRQ;
    };

    /**
     *  calls FLX-M for market eligibility rules
     * @param {function} load
     */
    this.eligibility = function (load) {

        /**
         * buils eligibility ServiceList request
         * @returns {string}
         */
        buildServiceList = function (requestXML, xslt) {

            if (this.showTrace) TraceXml(__file__, "* ServiceListRQ input", requestXML);
            var serviceListXML = xslt.Transform("jsCore/xslt/FLXFlightPriceRQ_FLXMServiceListRQ.xsl", requestXML);
            if (!serviceListXML)
                throw "144";
            if (this.showTrace) TraceXml(__file__, "* ServiceListRQ output", serviceListXML);

            return serviceListXML;
        };

        try {
            // call FLX-M for market eligibilty
            var serviceListDOM = this.serverSync.sendFLXM({strXXServerRequest: buildServiceList(this.domRequest.XML, this.xslt), nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: "eligibility", native: false, logs: this.logs, endTransaction: true})

            load(serviceListDOM, this.domRequest);
        }
        catch (error) {
            if (this.showTrace) TraceText(__file__, "* FLX-M eligibility call failed", error.toString());
        }
    };

    /**
     * Gets FLXM services
     * @param {xxDomDocument} domFlightPriceRS
     * @returns {xxDomDocument}
     */
    this.GetOBFees = function (domFlightPriceRS) {

        try {
            // gets FLXM OB fees
            var domServiceListRS = this.serverSync.sendFLXM({strXXServerRequest: this.BuildServiceListRQ(), nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: "obfees", native: false, logs: this.logs, endTransaction: true})
            if (domServiceListRS && domServiceListRS.Root.SelectSingle("OptionalServices/Service")) {
                // deletes all exisiting OB fees structure
                var nsFeeGroups = domFlightPriceRS.Root.Select("FareGroup/TravelerGroup/FeeGroup");
                if (nsFeeGroups)
                    for(var indexFeeGroup = 0; indexFeeGroup < nsFeeGroups.Count; indexFeeGroup++)
                        nsFeeGroups.GetItem(indexFeeGroup).Delete();

                // adds new OB fees structure
                var nsTravelers = domFlightPriceRS.Root.Select("FareGroup/TravelerGroup/TravelerIDRef|FareGroup/TravelerGroup/TravelerElementNumber");
                if(nsTravelers) {
                    for(var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                        var nodeTraveler = nsTravelers.GetItem(indexTraveler);

                        // builds the OB fees container element for first occurrence
                        if (!nodeTraveler.Parent.SelectSingle("FeeGroup") && domServiceListRS.Root.SelectSingle("OptionalServices/Service[./@ServiceCode = 'OB' and (./TravelerIDRef = '" + nodeTraveler.NormalizedText + "' or ./TravelerElementNumber = '" + nodeTraveler.NormalizedText + "')]")) {
                            var nodeFeeGroup = domFlightPriceRS.CreateElementNode("FeeGroup");

                            nodeFeeGroup.SetAttribute("Amount", "0");
                            if (nodeTraveler.Parent.SelectSingle("PricingInfo"))
                                nodeTraveler.Parent.SelectSingle("PricingInfo").InsertBefore(nodeFeeGroup)
                            else
                                nodeTraveler.Parent.AppendChild(nodeFeeGroup);
                        }

                        // builds OB fees structure
                        var nodeService = domServiceListRS.Root.SelectSingle("OptionalServices/Service[./@ServiceCode = 'OB' and (./TravelerIDRef = '" + nodeTraveler.NormalizedText + "' or ./TravelerElementNumber = '" + nodeTraveler.NormalizedText + "')]");
                        var strAmount = nodeTraveler.Parent.SelectSingle("FeeGroup").GetAttribute("Amount") ? nodeTraveler.Parent.SelectSingle("FeeGroup").GetAttribute("Amount") : "0";
                        var nodeServicePrice = nodeService.SelectSingle("ServicePrice");
                        var strServicePrice = nodeServicePrice.GetAttribute("Total") ? nodeServicePrice.GetAttribute("Total") : "0";
                        nodeTraveler.Parent.SelectSingle("FeeGroup").SetAttribute("Amount", (Number(strAmount) + Number(strServicePrice)));

                        var nodeFee = domFlightPriceRS.CreateElementNode("Fee");
                        nodeFee.SetAttribute("Refundable", "N");

                        var strServiceCode = nodeService.GetAttribute("ServiceCode");
                        var strSubCode = nodeService.GetAttribute("SubCode");
                        var nodeDescription = nodeService.SelectSingle("Description");
                        var nodeTravelerIDRef = nodeService.SelectSingle("TravelerIDRef");

                        if (strServiceCode)
                            nodeFee.SetAttribute("ServiceCode", strServiceCode);
                        if (strSubCode)
                            nodeFee.SetAttribute("SubCode", strSubCode);
                        var nodeAmount = domFlightPriceRS.CreateElementNode("Amount");
                        var nodeAmountText = domFlightPriceRS.CreateTextNode(strServicePrice);
                        nodeAmount.AppendChild(nodeAmountText);
                        nodeFee.AppendChild(nodeAmount);
                        // adds the BasePrice
                        if (nodeServicePrice.SelectSingle("BasePrice"))
                            nodeFee.AppendChild(nodeServicePrice.SelectSingle("BasePrice").Clone());
                        // adds the Taxes
                        if (nodeServicePrice.SelectSingle("Taxes"))
                            nodeFee.AppendChild(nodeServicePrice.SelectSingle("Taxes").Clone());
                        if (nodeDescription)
                            nodeFee.AppendChild(nodeDescription.Clone());
                        if (nodeTravelerIDRef)
                            nodeFee.AppendChild(nodeTravelerIDRef.Clone());						

                        nodeTraveler.Parent.SelectSingle("FeeGroup").AppendChild(nodeFee);
                    }
                }
            }
        }
        catch (error) {
            if (error.toString() != "No services found")
                throw "180000207";
        }

        return domFlightPriceRS;
    }

    /**
     * Gets FLXM optional services
     */
    this.GetOptionalServices = function () {

        try {
            // adds MaxTransferTimes
            if (this.setMaxTransferTimeOptionalServices)
                this.domRequest.Root.SetAttribute("setMaxTransferTime", "Y");

            var strServiceListRQ = this.BuildServiceListRQ();
            // adds SaleInfo
            strServiceListRQ = this.AddFLXMSaleInfo(strServiceListRQ);
            // gets FLXM optional services
            this.domServiceListRS = this.serverSync.sendFLXM({strXXServerRequest: strServiceListRQ, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: "services", native: false, logs: this.logs, endTransaction: true})

            if(this.domServiceListRS && this.domServiceListRS.Root.SelectSingle("OptionalServices/Service[not(@Method = \"X\")]")) {
                // flags if services returned
                this.gotServices = true;

                // adds InstantPurchase when Rules is returned
                var nsServices = this.domServiceListRS.Root.Select("OptionalServices/Service[Rules/Category[./@Name = \"Instant Purchase\" and not(./InstantPurchase)]");
                if (nsServices)
                    for (var indexService = 0; indexService < nsServices.Count; indexService++) {
                        var nodeService = nsServices.GetItem(indexService);

                        var nodeInstantPurchase  = this.domServiceListRS.CreateElementNode("InstantPurchase");
                        var nodeInstantPurchaseText = this.domServiceListRS.CreateTextNode(nodeService.SelectSingle("Rules/Category[@Name = \"Instant Purchase\"]").GetAttribute("Value"));
                        nodeInstantPurchase.AppendChild(nodeInstantPurchaseText);
                        nodeService.AppendChild(nodeInstantPurchase);
                    }

                // restores the SegmentIDRef at Service level for "ChangeOfGauge" scenarios
                var nsSeatServices = this.domServiceListRS.Root.Select("OptionalServices/Service[DescriptionVariable]");
                if (nsSeatServices && this.domRequest.Root.SelectSingle("OriginDestination/Flight/StopInfo/Stop[@ChangeOfGauge = \"Y\"]")) {
                    var domServiceListRQ = new xxDomDocument();
                    if (domServiceListRQ.LoadXML(strServiceListRQ)) {
                        for (var indexSeatService = 0; indexSeatService < nsSeatServices.Count; indexSeatService++) {
                            var nodeSeatService = nsSeatServices.GetItem(indexSeatService);

                            var nodeRequestedSeatService = domServiceListRQ.Root.SelectSingle("SelectedServices/Service[SegmentIDRef = \"" + nodeSeatService.SelectSingle("SegmentIDRef").NormalizedText + "\"]");
                            if (nodeRequestedSeatService) {
                                var nodeSegmentIDRef = nodeSeatService.SelectSingle("SegmentIDRef");
                                nodeSegmentIDRef.ReplaceText({domXML: this.domServiceListRS, strValue: nodeRequestedSeatService.SelectSingle("InitialSegmentIDRef").NormalizedText});
                                nodeSegmentIDRef.SetAttribute("ONPoint", nodeRequestedSeatService.SelectSingle("InitialSegmentIDRef").GetAttribute("ONPoint"));
                                nodeSegmentIDRef.SetAttribute("OFFPoint", nodeRequestedSeatService.SelectSingle("InitialSegmentIDRef").GetAttribute("OFFPoint"));

                                nodeSeatService.SelectSingle("Seats").SetAttribute("FlightSeg", nodeRequestedSeatService.SelectSingle("InitialSegmentIDRef").NormalizedText);
                            }
                        }
                    }
                }
            }
        }
        catch (error) {}
    };

    /**
     * Builds FLX BaggageCharge request
     * @param {{flightPrice: JsDCFlightPrice, domFlightPriceRS: xxDomDocument, domMultiFlightInformationRS: xxDomDocument}} parameters
     * @returns {String}
     */
    function BuildBaggageChargesRQ(parameters) {

        if (parameters.flightPrice.showTrace) TraceXml(__file__, "* BaggageChargesRQ input", parameters.flightPrice.domRequest.XML.AddXML(parameters.domFlightPriceRS.XML).AddXML(parameters.domMultiFlightInformationRS.XML));
        var strBaggageChargesRQ = parameters.flightPrice.xslt.Transform("jsCore/xslt/FLXFlightPriceRQ_FLXBaggageChargesRQ.xsl", parameters.flightPrice.domRequest.XML.AddXML(parameters.domFlightPriceRS.XML).AddXML(parameters.domMultiFlightInformationRS.XML));
        if (!strBaggageChargesRQ)
            throw "144#Could not transform request.";
        if (parameters.flightPrice.showTrace) TraceXml(__file__, "* BaggageChargesRQ output", strBaggageChargesRQ);

        return strBaggageChargesRQ;
    }

    /**
     * Builds FLXFlightPriceRS from the BaggageChargesRS
     * @param {{flightPrice: JsDCFlightPrice, strFlightPriceRS: String}} parameters
     * @returns {String}
     */
    function BuildBaggageChargesRS(parameters) {

        if (parameters.flightPrice.showTrace) TraceXml(__file__, "* FlightPriceRS to BaggageChargesRS input", parameters.strFlightPriceRS);
        var strFlightPriceRS = parameters.flightPrice.xslt.Transform("jsCore/xslt/FLXBaggageChargesRS_FLXFlightPriceRS.xsl", parameters.strFlightPriceRS);
        if (!strFlightPriceRS)
            throw "144#Could not transform request.";
        if (parameters.flightPrice.showTrace) TraceXml(__file__, "* FlightPriceRS to BaggageChargesRS output", strFlightPriceRS);

        return strFlightPriceRS;
    }

    /**
     * Gets FLXM baggage
     * @param {{domFlightPriceRS: xxDomDocument, domMultiFlightInformationRS: xxDomDocument, strFLXMConfig: String}} parameters
     */
    this.GetFLXMBaggage = function (parameters) {

        try {
            var domFLXMTC = BuildFLXMTC({domTC: this.domTC, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: (typeof parameters.strFLXMConfig === 'undefined')? "baggage": parameters.strFLXMConfig});
            var providerFLXM = new JsXXServer(domFLXMTC);

            // adds MaxTransferTimes
            if (this.setMaxTransferTimeBaggageAllowance)
                this.domRequest.Root.SetAttribute("setMaxTransferTime", "Y");

            var domBaggageChargesRS = providerFLXM.SendTransaction({strXXServerRequest: BuildBaggageChargesRQ({flightPrice: this, domFlightPriceRS: parameters.domFlightPriceRS, domMultiFlightInformationRS: parameters.domMultiFlightInformationRS}), endTransaction: true});
            if (!providerFLXM.IsErrorResponse() && domBaggageChargesRS.Root.SelectSingle("OriginDestination/Bags")) {
                // bags were returned
                var nsAllowances = domBaggageChargesRS.SelectNode(domBaggageChargesRS.Root,"OriginDestination/Allowance");
                if (nsAllowances) {
                    for(var indexAllowance = 0; indexAllowance < nsAllowances.Count; indexAllowance ++) {
                        var nodeAllowance = nsAllowances.GetItem(indexAllowance);

                        var nsSegmentIDRef = domBaggageChargesRS.SelectNodes(nodeAllowance, "SegmentIDRef");
                        var nodeTravelerIDRef = nodeAllowance.SelectSingle("TravelerIDRef");
                        var nodeTicketBox = nodeAllowance.SelectSingle("TicketBox");
                        if (nodeTravelerIDRef && nsSegmentIDRef && nodeTicketBox) {
                            var strTGIndex = this.domRequest.Root.SelectSingle("TravelerIDs[@AssociationID = \"" + nodeTravelerIDRef.NormalizedText + "\"]").GetAttribute("TGIndex");

                            for(var indexSegment = 0; indexSegment < nsSegmentIDRef.Count; indexSegment++) {
                                var nodeSegmentIDRef = nsSegmentIDRef.GetItem(indexSegment);

                                var nodeRelatedSegment = parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup[position() = \"" + strTGIndex + "\"]/FareRules/FareInfo/RelatedSegment[SegmentIDRef = \"" + nodeSegmentIDRef.NormalizedText + "\"]");
                                nodeRelatedSegment = nodeRelatedSegment? nodeRelatedSegment: parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup[position() = \"" + strTGIndex + "\"]/FareRules/FareInfo/RelatedSegment[SegmentIDRef/@FlightRefKey = \"" + nodeSegmentIDRef.NormalizedText + "\"]");
                                if(nodeRelatedSegment) {
                                    var nodeBaggageAllowance = nodeRelatedSegment.SelectSingle("BaggageAllowance");
                                    if(nodeBaggageAllowance)
                                        nodeBaggageAllowance.ReplaceText({domXML: parameters.domFlightPriceRS, strValue: nodeTicketBox.NormalizedText});
                                    else {
                                        nodeBaggageAllowance = parameters.domFlightPriceRS.CreateElementNode("BaggageAllowance");
                                        var nodeBaggageAllowanceText = parameters.domFlightPriceRS.CreateTextNode(nodeTicketBox.NormalizedText);

                                        nodeBaggageAllowance.AppendChild(nodeBaggageAllowanceText);
                                        nodeRelatedSegment.AppendChild(nodeBaggageAllowance);
                                    }
                                }
                            }
                        }
                    }
                }

                // adds BaggageData
                parameters.domFlightPriceRS.LoadXML(BuildBaggageChargesRS({flightPrice: this, strFlightPriceRS: parameters.domFlightPriceRS.XML.AddXML(domBaggageChargesRS.XML)}));
            }
            else
                if (this.domRequest.Root.SelectSingle("PricingInfo[@RequestOptions]"))
                    this.domRequest.Root.SelectSingle("PricingInfo").RemoveAttribute("RequestOptions");
        }
        catch (error) {
            if (this.domRequest.Root.SelectSingle("PricingInfo[@RequestOptions]"))
                this.domRequest.Root.SelectSingle("PricingInfo").RemoveAttribute("RequestOptions");

            TraceText(__file__, "* Baggage was not completed successfully", error.toString());
        }
    };

    /**
     * Builds Baggage Allowance request
     * @param {xxNode} nodeFareGroup
     * @returns {String}
     */
    this.BuildBaggageAllowanceRQ = function (nodeFareGroup) {

        // adds the Cabin to the Flights
        var nsFlights = this.domRequest.SelectNodes(this.domRequest.Root, "OriginDestination/Flight[not(Cabin)]");
        if (nsFlights)
            for (var indexFlight = 0; indexFlight < nsFlights.Count; indexFlight++)
                this.domRequest.PutNode(nsFlights.GetItem(indexFlight), "Cabin", GetCabinByClass({domRequest: this.domRequest, nodeFlight: nsFlights.GetItem(indexFlight), airlineId: this.airlineId, showTrace: this.showTrace}));

        this.domRequest.Root.SetAttribute("travelerTicketIdentification", this.travelerTicketIdentification);
        var strInput = this.domRequest.XML.AddXML(this.aclInfo.XML);
        if (nodeFareGroup)
            strInput = strInput.AddXML(nodeFareGroup.XML);

        if (this.showTrace) TraceXml(__file__, "* BaggageAllowanceRQ input", strInput);
        var strBaggageAllowanceRQ = this.xslt.Transform("jsCore/xslt/FLXFlightPriceRQ_FLXBaggageAllowanceRQ.xsl", strInput);
        if (!strBaggageAllowanceRQ)
            throw "144#Could not transform request.";
        if (this.showTrace) TraceXml(__file__, "* BaggageAllowanceRQ output", strBaggageAllowanceRQ);
        
        return strBaggageAllowanceRQ;
    };

    /**
     * Adds FLXM Baggage Allowance to the current domServiceListRS
     * @param {xxNode} nodeFareGroup
     */
    this.GetBaggageAllowance = function (nodeFareGroup) {

        try {
            // adds MaxTransferTimes
            if (this.setMaxTransferTimeBaggageAllowance)
                this.domRequest.Root.SetAttribute("setMaxTransferTime", "Y");

            // gets FLXM baggage allowance
            var domBaggageAllowanceRS = this.serverSync.sendFLXM({strXXServerRequest: this.BuildBaggageAllowanceRQ(nodeFareGroup), nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: "baggage", native: false, logs: this.logs, endTransaction: true});

            var nsBagServices = domBaggageAllowanceRS.Root.Select("OriginDestination/Service[not(./@Method = \"X\") and not(./Amount = \"incl\")]");
            if (nsBagServices) {
                // initializes domServiceListRS
                if (!this.domServiceListRS) {
                    this.domServiceListRS = new xxDomDocument();
                    this.domServiceListRS.LoadXML("<ServiceList/>");
                }

                // appends OptionalServices node if missing
                var nodeOptionalServices = this.domServiceListRS.Root.SelectSingle("OptionalServices");
                if (!nodeOptionalServices) {
                    nodeOptionalServices = this.domServiceListRS.CreateElementNode("OptionalServices");
                    this.domServiceListRS.Root.AppendChild(nodeOptionalServices);
                }

                // appends CurrencyCode node if missing
                var nodeCurrencyCode = domBaggageAllowanceRS.Root.SelectSingle("CurrencyCode");
                if (!nodeOptionalServices.SelectSingle("CurrencyCode") && nodeCurrencyCode) {
                    if (nodeOptionalServices.FirstChild)
                        nodeOptionalServices.FirstChild.InsertBefore(nodeCurrencyCode.Clone());
                    else
                        nodeOptionalServices.AppendChild(nodeCurrencyCode.Clone());
                }

                for (var indexBagService = 0; indexBagService < nsBagServices.Count; indexBagService++) {
                    var nodeBagService = nsBagServices.GetItem(indexBagService);

                    var nodeBagServicePrice = nodeBagService.SelectSingle("ServicePrice");
                    var strServiceTotalPrice = nodeBagService.SelectSingle("Amount")? nodeBagService.SelectSingle("Amount").NormalizedText: "";
                    var nodeCurrencyCode = nodeBagServicePrice.SelectSingle("CurrencyCode")? nodeBagServicePrice.SelectSingle("CurrencyCode"): nodeBagService.Parent.Parent.SelectSingle("CurrencyCode");
                    var strQuantity = "1";

                    if (nodeFareGroup || (this.domRequest.Root.SelectSingle("PNRViewRS/FareGroup") && this.domRequest.Root.SelectSingle("OptionalServices/Service"))) {
                        var strSubCode = nodeBagService.GetAttribute("SubCode");
                        var strRefKey = nodeBagService.GetAttribute("TrxRefKey");

                        if (strSubCode && strRefKey) {
                            var nodeServiceFromRequest = this.domRequest.Root.SelectSingle("OptionalServices/Service[./@SubCode = '" + strSubCode + "' and ./@TrxRefKey = '" + strRefKey + "']");
                        }
                        else {
                            var strTravelerIDRef = nodeBagService.SelectSingle("TravelerIDRef").NormalizedText;
                            var nsSegmentIDRefs = nodeBagService.Select("SegmentIDRef");
                            if (nsSegmentIDRefs && strSubCode && strTravelerIDRef) {
                                var isServiceFound = false;
                                for (var indexSegmentIDRef = 0; indexSegmentIDRef < nsSegmentIDRefs.Count; indexSegmentIDRef++) {

                                    var nodeSegmentIDRef = nsSegmentIDRefs.GetItem(indexSegmentIDRef);
                                    var nodeServiceFromRequest = this.domRequest.Root.SelectSingle("OptionalServices/Service[./@SubCode = '" + strSubCode + "' and ./TravelerIDRef = '" + strTravelerIDRef + "' and ./SegmentIDRef = '" + nodeSegmentIDRef.NormalizedText + "']");
                                    if (nodeServiceFromRequest) {
                                        isServiceFound = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!isServiceFound) {
                            nodeBagService.Delete();

                            continue;
                        }
                    }

                    if(!nodeBagServicePrice.SelectSingle("CurrencyCode"))
                        nodeBagServicePrice.AppendChild(nodeCurrencyCode.Clone());

                    if (!nodeFareGroup && !this.domRequest.Root.SelectSingle("OptionalServices/Service"))
                        nodeOptionalServices.AppendChild(nodeBagService);
                    else {
                        var strSubCode = nodeBagService.GetAttribute("SubCode");
                        var nodeTravelerIDRef = nodeBagService.SelectSingle("TravelerIDRef");
                        var nsSegmentIDRefs = nodeBagService.Select("SegmentIDRef");
                        if (strSubCode && nodeTravelerIDRef && nsSegmentIDRefs) {
                            for (var indexSegmentIDRef = 0; indexSegmentIDRef < nsSegmentIDRefs.Count; indexSegmentIDRef++) {
                                nodeSegmentIDRef = nsSegmentIDRefs.GetItem(indexSegmentIDRef);

                                var nodeBagServiceRQ = this.domRequest.Root.SelectSingle("OptionalServices/Service[./@SubCode = '" + strSubCode + "' and ./TravelerIDRef = '" + nodeTravelerIDRef.NormalizedText + "' and ./SegmentIDRef = '" + nodeSegmentIDRef.NormalizedText + "']");
                                if (nodeBagServiceRQ) {
                                    if (nodeBagServiceRQ.GetAttribute("TrxRefKey"))
                                        nodeBagService.SetAttribute("TrxRefKey", nodeBagServiceRQ.GetAttribute("TrxRefKey"));

                                    // compares Service Price
                                    var nodeBasePrice = nodeBagServiceRQ.SelectSingle("ServicePrice/ItemPrice/BasePrice")? nodeBagServiceRQ.SelectSingle("ServicePrice/ItemPrice/BasePrice"): nodeBagServiceRQ.SelectSingle("ServicePrice/BasePrice");
                                    var strBagServiceBasePrice = nodeBagService.SelectSingle("ServicePrice/BasePrice")? nodeBagService.SelectSingle("ServicePrice/BasePrice").GetAttribute("Amount"): "0";
                                    if (nodeBasePrice && (nodeBasePrice.GetAttribute("Amount") != strBagServiceBasePrice))
                                        AddInfoGroup({domResponse: this.domServiceListRS, strText: "There is a Service Price discrepancy for " + nodeBagService.SelectSingle("Description").NormalizedText + " Service "});

                                    if (nodeBagService.SelectSingle("Baggage/ExcessLast") && nodeBagService.SelectSingle("Baggage/ExcessFirst"))
                                        nodeBagService.SetAttribute("MaxQuantity", (parseInt(nodeBagService.SelectSingle("Baggage/ExcessLast").NormalizedText) - parseInt(nodeBagService.SelectSingle("Baggage/ExcessFirst").NormalizedText) + 1).toString());
                                    else{
                                        if(nodeServiceFromRequest && nodeServiceFromRequest.GetAttribute("Quantity"))
                                            nodeBagService.SetAttribute("MaxQuantity", nodeServiceFromRequest.GetAttribute("Quantity"));
                                    }

                                    nodeOptionalServices.AppendChild(nodeBagService);
                                }
                            }
                        }
                    }
                }

                // flags if services returned
                if(this.domServiceListRS && this.domServiceListRS.Root.SelectSingle("OptionalServices/Service[not(@Method = \"X\")]"))
                    this.gotServices = true;
            }
        }
        catch (error) {}
    };

    /**
     * Gets FLXM services
     * @param {xxDomDocument} domFlightPriceRS
     * @constructor
     */
    this.GetServices = function (domFlightPriceRS) {

        // gets optional services
        if (this.optionalServices)
            this.GetOptionalServices();

        // gets baggage Allowance
        if (this.baggageAllowance)
            this.GetBaggageAllowance((domFlightPriceRS)? domFlightPriceRS.Root.SelectSingle("FareGroup").Clone(): null);

        if (this.domServiceListRS) {
            // removes method X services
            var nsServices = this.domServiceListRS.Root.Select("OptionalServices/Service[@Method = \"X\"]");
            if (nsServices) {
                for (var indexService = 0; indexService < nsServices.Count; indexService++)
                    nsServices.GetItem(indexService).Delete();
            }

            if (!this.domServiceListRS.Root.Select("OptionalServices/Service")) {
                this.domServiceListRS = new xxDomDocument();
                this.domServiceListRS.LoadXML("<ServiceListRS><InfoGroup><Error><Text>No services found.</Text></Error></InfoGroup></ServiceListRS>");
            }
        }
        else {
            this.domServiceListRS = new xxDomDocument();
            this.domServiceListRS.LoadXML("<ServiceListRS><InfoGroup><Error><Text>No services found.</Text></Error></InfoGroup></ServiceListRS>");
        }
    }

    /**
     * Builds FLXM AlterFareSearchRQ request
     * @param {{flightPrice: JsDCFlightPrice, strFlightPriceRS: String}} parameters
     * @returns {String}
     */
    function BuildServiceSearchRQ(parameters) {

        if (parameters.flightPrice.showTrace) TraceXml(__file__, "* FLXM ServiceSearchRQ input", parameters.strFlightPriceRS.AddXML(parameters.flightPrice.requestXML));
        var strServiceSearchRQ = parameters.flightPrice.xslt.Transform("jsCore/xslt/FLXFlightPriceRS_FLXMServiceSearchRQ.xsl", parameters.strFlightPriceRS.AddXML(parameters.flightPrice.requestXML));
        if (!strServiceSearchRQ)
            throw "144";
        if (parameters.flightPrice.showTrace) TraceXml(__file__, "* FLXM ServiceSearchRQ output", strServiceSearchRQ);

        return strServiceSearchRQ;
    };

    /**
     * Builds FLXM AlterFareSearchRQ request
     * @param {{flightPrice: JsDCFlightPrice, strServiceSearchRS: String}} parameters
     * @returns {String}
     */
    function BuildFareSearchRS(parameters) {

        if (parameters.flightPrice.showTrace) TraceXml(__file__, "* FLX FlightPriceRS input", parameters.strServiceSearchRS.AddXML(parameters.flightPrice.requestXML));
        var strFlightPriceRS = parameters.flightPrice.xslt.Transform("jsCore/xslt/FLXMServiceSearchRS_FLXFlightPriceRS.xsl", parameters.strServiceSearchRS.AddXML(parameters.flightPrice.requestXML));
        if (!strFlightPriceRS)
            throw "144";
        if (parameters.flightPrice.showTrace) TraceXml(__file__, "* FLX FlightPriceRS output", strFlightPriceRS);

        return strFlightPriceRS;
    };

    /**
     * Calls FLX-M for shopping rules (discounts, taxes, etc)
     * @param {{domFlightPriceRS: xxDomDocument, boundBased: Boolean}} parameters
     */
    this.GetFareSelectorRules = function(parameters) {

        /**
         * loads merchandising info into solution
         * @param {xxNode} fareGroupNODE
         * @param {xxDomDocument} serviceSearchDOM
         */
        function loadMerchandising(fareGroupNODE, serviceSearchDOM) {

            var travelerGroupSET = fareGroupNODE.Select("TravelerGroup");
            if (travelerGroupSET) {
                var travelerGroupCOUNT = travelerGroupSET.Count;
                for (var travelerGroupPOS = 0; travelerGroupPOS < travelerGroupCOUNT; travelerGroupPOS++) {
                    var travelerGroupNODE = travelerGroupSET.GetItem(travelerGroupPOS);

                    var travelerIDRef = travelerGroupNODE.ValueOfSelect("TravelerIDRef");
                    var travelerIDSET = travelerGroupNODE.Select("TravelerIDRef[not(text() = '" + travelerIDRef + "')]");
                    var fareInfoSET = travelerGroupNODE.Select("FareRules/FareInfo[FareBasisCode[@Code]]");
                    if (fareInfoSET) {
                        var fareInfoCOUNT= fareInfoSET.Count;
                        for( var fareInfoPOS = 0; fareInfoPOS < fareInfoCOUNT; fareInfoPOS++) {
                            var fareInfoNODE = fareInfoSET.GetItem(fareInfoPOS);

                            var codePriceClass = fareInfoNODE.SelectSingle("FareBasisCode").GetAttribute("Code");
                            var serviceNODE = serviceSearchDOM.Root.SelectSingle("OptionalServices/Service[(./@SubCode = '" + codePriceClass + "') and (./TravelerIDRef = '" + travelerIDRef + "')]");
                            if (serviceNODE) {
                                // adds included services
                                var itemSET = serviceNODE.Select("BundleContent/Item[@Type = 'Included']");
                                if (itemSET) {
                                    // gets included sevices node
                                    var includedServicesNODE = fareGroupNODE.SelectSingle("IncludedServices");
                                    if (!includedServicesNODE) {
                                        includedServicesNODE = serviceSearchDOM.CreateElementNode("IncludedServices");
                                        // adds included services node if missing
                                        fareGroupNODE.AppendChild(includedServicesNODE);
                                    }

                                    var itemCOUNT = itemSET.Count;
                                    for (var itemPOS = 0; itemPOS < itemCOUNT; itemPOS++) {
                                        var itemNODE = itemSET.GetItem(itemPOS).Clone();

                                        if (travelerIDSET) {
                                            for (var travelerIDPOS = 0; travelerIDPOS < travelerIDSET.Count; travelerIDPOS++)
                                                itemNODE.SelectSingle("TravelerIDRef[last()]").InsertAfter(travelerIDSET.GetItem(travelerIDPOS).Clone());
                                        }

                                        includedServicesNODE.AppendChild(itemNODE);
                                    }
                                }

                                // adds merchandising text
                                var textSET = serviceNODE.Select("DescriptionDetails/Text")
                                if (textSET) {
                                    var priceClassDescriptionNODE = serviceSearchDOM.CreateElementNode("PriceClassDescription");
                                    fareInfoNODE.SelectSingle("FareBasisCode").InsertAfter(priceClassDescriptionNODE);

                                    var textCOUNT = textSET.Count;
                                    for (var textPOS = 0; textPOS < textCOUNT; textPOS++)
                                        priceClassDescriptionNODE.AppendChild(textSET.GetItem(textPOS).Clone());
                                }

                                // updates highest/lowest PriceClass to upsell
                                if (!fareGroupNODE.GetAttribute("highestUpsell") || (Number(fareGroupNODE.GetAttribute("highestUpsell")) < Number(serviceNODE.GetAttribute("ColumnOrder"))))
                                    fareGroupNODE.SetAttribute("highestUpsell", serviceNODE.GetAttribute("ColumnOrder"));
                                // updates highest PriceClass to upsell
                                if (!fareGroupNODE.GetAttribute("lowestUpsell") || (Number(fareGroupNODE.GetAttribute("lowestUpsell")) > Number(serviceNODE.GetAttribute("ColumnOrder"))))
                                    fareGroupNODE.SetAttribute("lowestUpsell", serviceNODE.GetAttribute("ColumnOrder"));
                            }
                        }
                    }
                }
            }
        }

        try {
            var strServiceSearchRQ = BuildServiceSearchRQ({flightPrice: this, strFlightPriceRS: parameters.domFlightPriceRS.XML});
            // gets FLXM merchandising rules
            var strServiceSearchRS = this.serverSync.sendFLXM({strXXServerRequest: strServiceSearchRQ, nodeProvider: this.GetProvider(), strRequestName: this.requestName, strFLXMConfig: "selector", native: true, logs: this.logs, endTransaction: true})

            if(flightPrice.domRequest.Root.SelectSingle("PricingInfo[@PlusFares = 'Y']"))
                parameters.domFlightPriceRS.LoadXML(BuildFareSearchRS({flightPrice: this, strServiceSearchRS: strServiceSearchRS.AddXML(strServiceSearchRQ).AddXML(parameters.domFlightPriceRS.XML)}));
            else {
                var domServiceSearchRS = new xxDomDocument();
                if (domServiceSearchRS.LoadXML(strServiceSearchRS)) {
                    var nsFareGroups = parameters.domFlightPriceRS.Root.Select("FareGroup");
                    if (nsFareGroups) {
                        var nodeFareGroup = nsFareGroups.GetItem(0);
                        // loads merchandising info
                        loadMerchandising(nodeFareGroup, domServiceSearchRS);
                        // starts loop for upsells
                        for (var indexFareGroup = (nsFareGroups.Count - 1); indexFareGroup > 0; indexFareGroup--) {
                            var nodeUpsell = nsFareGroups.GetItem(indexFareGroup);

                            var highestUpsell = Number(nodeFareGroup.GetAttribute("highestUpsell"));
                            var lowestUpsell = Number(nodeFareGroup.GetAttribute("lowestUpsell"));
                            var nodeFareBasisCode = nodeUpsell.SelectSingle("TravelerGroup/FareRules/FareInfo/FareBasisCode[@Code]");
                            if (nodeFareBasisCode) {
                                var strPriceClassCode = nodeFareBasisCode.GetAttribute("Code");
                                var nodeService = domServiceSearchRS.Root.SelectSingle("OptionalServices/Service[(./@SubCode = '" + strPriceClassCode + "') and ./@ColumnOrder]");
                                if (nodeService) {
                                    if (((highestUpsell != lowestUpsell) && (Number(nodeService.GetAttribute("ColumnOrder")) >= highestUpsell)) || ((highestUpsell == lowestUpsell) && (Number(nodeService.GetAttribute("ColumnOrder")) > highestUpsell))) {
                                        // loads merchandising info
                                        loadMerchandising(nodeUpsell, domServiceSearchRS);

                                        continue;
                                    }
                                }
                            }

                            // removes not valid upsell
                            nodeUpsell.Delete();
                        }
                    }
                }
            }
        }
        catch (error) {
            // removes brand info
            if (parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/FareRules/FareInfo/FareBasisCode[@PriceClass or @Code]")) {
                var nsFareBasisCodes = parameters.domFlightPriceRS.Root.Select("FareGroup/TravelerGroup/FareRules/FareInfo/FareBasisCode[@PriceClass or @Code]");
                if (nsFareBasisCodes)
                    for (var indexFareBasisCode = 0; indexFareBasisCode < nsFareBasisCodes.Count; indexFareBasisCode++) {
                        nsFareBasisCodes.GetItem(indexFareBasisCode).RemoveAttribute("PriceClass");
                        nsFareBasisCodes.GetItem(indexFareBasisCode).RemoveAttribute("Code");
                    }
            }
        }
    }

    /**
     * Updates the FareGroup/TravelerGroup/Price/Taxes elements with amount deducted
     * @param {{nodeTaxes: xxNode, amount: Number}} parameters
     * @returns {String}
     */
    function DeductAmount(parameters) {

        if (parameters.nodeTaxes && parameters.amount) {
            // Taxes
            var strTaxesAmount = parameters.nodeTaxes.GetAttribute("Amount");
            if (strTaxesAmount)
                parameters.nodeTaxes.SetAttribute("Amount", (Number(strTaxesAmount) - parameters.amount).toString());

            // Price
            var strPriceAmount = parameters.nodeTaxes.Parent.GetAttribute("Total");
            if (strPriceAmount)
                parameters.nodeTaxes.Parent.SetAttribute("Total", (Number(strPriceAmount) - parameters.amount).toString());

            var travelerCount = 1;
            var nodeTravelerGroup = parameters.nodeTaxes.Parent.Parent;
            if (nodeTravelerGroup && nodeTravelerGroup.GetAttribute("TypeCount"))
                travelerCount = Number(nodeTravelerGroup.GetAttribute("TypeCount"));

            // TravelerGroup
            var strTravelerGroupAmount = parameters.nodeTaxes.Parent.Parent.GetAttribute("TypeTotalPrice");
            if (strTravelerGroupAmount)
                parameters.nodeTaxes.Parent.Parent.SetAttribute("TypeTotalPrice", (Number(strTravelerGroupAmount) - (parameters.amount*travelerCount)).toString());

            // FareGroup
            var strFareGroupAmount = parameters.nodeTaxes.Parent.Parent.Parent.GetAttribute("TotalPrice");
            if (strFareGroupAmount)
                parameters.nodeTaxes.Parent.Parent.Parent.SetAttribute("TotalPrice", (Number(strFareGroupAmount) - (parameters.amount*travelerCount)).toString());
        }
    }

    /**
     * Removes all taxes supplied(but or only depending on exclude flag) and deducts amount based on flag from FareGroup
     * @param {{domFlightPriceRS: xxDomDocument, arrTaxes: Array, exclude: Boolean, deductAmount: Boolean}} parameters
     * @returns {String}
     */
    this.RemoveTaxes = function(parameters) {

        var nsPrices = parameters.domFlightPriceRS.SelectNodes(parameters.domFlightPriceRS.Root, "FareGroup/TravelerGroup/Price[Taxes/Tax]");
        if (nsPrices) {
            for (var indexPrice = 0; indexPrice < nsPrices.Count; indexPrice++) {
                var nodeTaxes = nsPrices.GetItem(indexPrice).SelectSingle("Taxes");

                var nodeTax = nodeTaxes.SelectSingle("Tax");
                while (nodeTax) {
                    var strTaxCode = nodeTax.SelectSingle("Designator").NormalizedText;
                    var nodeNextTax = nodeTax.NextSibling;

                    if (parameters.arrTaxes && parameters.arrTaxes.length > 0) {
                        if ((parameters.exclude && !(parameters.arrTaxes.indexOf(strTaxCode) > -1) || (!parameters.exclude && parameters.arrTaxes.indexOf(strTaxCode) > -1))) {
                            if (parameters.deductAmount)
                                DeductAmount({nodeTaxes: nodeTaxes, amount: Number(nodeTax.GetAttribute("Amount"))});

                            nodeTax.Delete();
                        }
                    }
                    else
                        nodeTax.Delete();

                    nodeTax = nodeNextTax;
                }
            }
        }

        var nsFareComponents = parameters.domFlightPriceRS.SelectNodes(parameters.domFlightPriceRS.Root, "FareGroup/TravelerGroup/FareRules/FareInfo/FareComponent[Taxes/Tax]");
        if (nsFareComponents) {
            for (var indexFareComponent = 0; indexFareComponent < nsFareComponents.Count; indexFareComponent++) {
                var nodeTaxes = nsFareComponents.GetItem(indexFareComponent).SelectSingle("Taxes");

                var nodeTax = nodeTaxes.SelectSingle("Tax");
                while (nodeTax) {
                    var strTaxCode = nodeTax.SelectSingle("Designator").NormalizedText;
                    var nodeNextTax = nodeTax.NextSibling;

                    if (parameters.arrTaxes && parameters.arrTaxes.length > 0) {
                        if ((parameters.exclude && !(parameters.arrTaxes.indexOf(strTaxCode) > -1) || (!parameters.exclude && parameters.arrTaxes.indexOf(strTaxCode) > -1))) {
                            nodeTax.Remove();
                            nodeTax.Delete();
                        }
                    }
                    else {
                        nodeTax.Remove();
                        nodeTax.Delete();
                    }

                    nodeTax = nodeNextTax;
                }
            }
        }

        TraceXml("(" + this.airlineId + ") " + __file__, ((parameters.exclude)? "* Remove taxes but": "* Remove taxes only") + " (" + parameters.arrTaxes + ")", parameters.domFlightPriceRS.XML);
    };

    /**
     * Calculate AddCollect, Refund, Netting Amount and Forfeited Amount in Auto Exchange.
     * @param {{domFlightPriceRS: xxDomDocument, domRequest: xxDomDocument, domTC: xxDomDocument}} parameters
     * @returns {xxDomDocument}
     */
    function ApplyNetting(parameters) {
        TraceXml(__file__, "Doing Netting Calculation", "Doing Netting Calculation");
        var nettingApply;

        var travGroupNodes = parameters.domFlightPriceRS.SelectNode( parameters.domFlightPriceRS.Root, "FareGroup/TravelerGroup" );

        if(travGroupNodes){
            for( var iTravGroupCount =0; iTravGroupCount < travGroupNodes.Count; iTravGroupCount++ ) {
                var thisTravGroup = travGroupNodes.GetItem( iTravGroupCount );
                if( thisTravGroup ) {
                    var newPriceNode = thisTravGroup.SelectSingle("Price");
                    var oldPriceNode = parameters.domRequest.Root.SelectSingle("TicketImageRS/TicketImage/FareGroup/TravelerGroup[@TypeRequested =  '" + thisTravGroup.GetAttribute("TypeRequested") + "']/Price");

                    if(newPriceNode && oldPriceNode){
                        var newTotalPrice = Number(newPriceNode.GetAttribute("Total"));
                        var newBasefareAmount = newPriceNode.SelectSingle("BaseFare") ? Number(newPriceNode.SelectSingle("BaseFare").GetAttribute("Amount")):0;
                        var newTotalTaxesAmount = newPriceNode.SelectSingle("Taxes") ? Number(newPriceNode.SelectSingle("Taxes").GetAttribute("Amount")):0;

                        var oldTotalPrice = Number(newPriceNode.GetAttribute("Total"));
                        var oldBasefareAmount = oldPriceNode.SelectSingle("BaseFare") ? Number(oldPriceNode.SelectSingle("BaseFare").GetAttribute("Amount")):0;
                        var oldTotalTaxesAmount = oldPriceNode.SelectSingle("Taxes") ? Number(oldPriceNode.SelectSingle("Taxes").GetAttribute("Amount")):0;

                        var vCarrier = parameters.domRequest.Root.SelectSingle("PricingInfo/ValidatingCarrier")? parameters.domRequest.Root.SelectSingle("PricingInfo/ValidatingCarrier").NormalizedText: "";
                        var nodeParm_lookupFile = CheckNettingNodeParm({domTC: parameters.domTC, vCarrier: vCarrier});

                        if(thisTravGroup.SelectSingle("ExchangeInfo/Penalty/@Total"))
                            thisTravGroup.SelectSingle("ExchangeInfo/Penalty").SetAttribute("OriginalTotal", thisTravGroup.SelectSingle("ExchangeInfo/Penalty").GetAttribute("Total"))
                        if(thisTravGroup.SelectSingle("ExchangeInfo/Penalty/@Amount"))
                            thisTravGroup.SelectSingle("ExchangeInfo/Penalty").SetAttribute("OriginalAmount", thisTravGroup.SelectSingle("ExchangeInfo/Penalty").GetAttribute("Amount"))

                        if(nodeParm_lookupFile) {
                            var nodToApplyNetting =  nodeParm_lookupFile.GetAttribute("ApplyNetting");
                            nettingApply = nodToApplyNetting == "Y" ? true : false;
                            if(nettingApply)
                                parameters.domFlightPriceRS = MarkNettingExcludeTaxesPD({domFlightPriceRS: parameters.domFlightPriceRS, newPriceNode: newPriceNode, nodeParm_lookupFile: nodeParm_lookupFile});
                        }
                        var penaltyNodeClone = thisTravGroup.SelectSingle("ExchangeInfo/Penalty") ? thisTravGroup.SelectSingle("ExchangeInfo/Penalty").Clone() : null;
                        CreateAddCollectNode({domFlightPriceRS: parameters.domFlightPriceRS, thisTravGroup: thisTravGroup, newPriceNode: newPriceNode, oldPriceNode: oldPriceNode, nettingApply: nettingApply, nodeParm_lookupFile: nodeParm_lookupFile, domRequest: parameters.domRequest});

                        if(nettingApply && ((parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/ExchangeInfo/AdditionalCollection") && parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/ExchangeInfo/Refund")) || parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/Price/Taxes/Tax/@UsedCompensated")) || (parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/ExchangeInfo/@AppliedNetting"))){
                            CreateNettingNode({domFlightPriceRS: parameters.domFlightPriceRS, thisTravGroup: thisTravGroup, newPriceNode: newPriceNode, oldPriceNode: oldPriceNode, nettingApply: nettingApply, nodeParm_lookupFile: nodeParm_lookupFile, penaltyNodeClone : penaltyNodeClone});
                            if(parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/ExchangeInfo/AdditionalCollection"))
                                parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/ExchangeInfo/AdditionalCollection").SetAttribute("NettingApplied", "Y");
                            if(parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/ExchangeInfo/Refund"))
                                parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/ExchangeInfo/Refund").SetAttribute("NettingApplied", "Y");
                        }
                        if(thisTravGroup.SelectSingle("ExchangeInfo/Penalty/@OriginalTotal"))
                            thisTravGroup.SelectSingle("ExchangeInfo/Penalty").RemoveAttribute("OriginalTotal");
                        if(thisTravGroup.SelectSingle("ExchangeInfo/Penalty/@OriginalAmount"))
                            thisTravGroup.SelectSingle("ExchangeInfo/Penalty").RemoveAttribute("OriginalAmount");
                        if(thisTravGroup.SelectSingle("ExchangeInfo/@AppliedNetting"))
                            thisTravGroup.SelectSingle("ExchangeInfo/@AppliedNetting").RemoveAttribute("AppliedNetting");
                    }

                    //Remove @TaxInPreviousTicket in Tax node.
                    var taxInPreviousTicketNode = parameters.domFlightPriceRS.SelectNode(thisTravGroup, "Price/Taxes/Tax/@TaxInPreviousTicket");
                    if(taxInPreviousTicketNode) {
                        for (var iTax = 0; iTax < taxInPreviousTicketNode.Count; iTax++) {
                            var taxNodeWithAttr = taxInPreviousTicketNode.GetItem(iTax);
                            if (taxNodeWithAttr)
                                taxNodeWithAttr.RemoveAttribute("TaxInPreviousTicket");
                        }
                    }
                }
            }
        }

        return parameters.domFlightPriceRS;
    }

    /**
     * Marks RF Taxes defined in the lookup under NettingExcludeTaxes as PD.
     * @param {{domFlightPriceRS: xxDomDocument, newPriceNode: xxNode, nodeParm_lookupFile: xxNode}} parameters
     * returns xxDomDocument
     */
    function MarkNettingExcludeTaxesPD(parameters) {
        var lookupNodeDom = new xxDomDocument();
        if(lookupNodeDom.LoadXML(parameters.nodeParm_lookupFile.XML)) {
            var taxesToExclude = lookupNodeDom.SelectNode(lookupNodeDom.Root, "NettingExcludeTaxes/TaxCode");
            if(taxesToExclude) {
                for(var taxIndex=0; taxIndex < taxesToExclude.Count; taxIndex++) {
                    var excTax = taxesToExclude.GetItem(taxIndex);
                    if (excTax) {
                        var excTaxesInFlightPriceRS = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[@Paid = \"RF\" and Designator = '" + excTax.NormalizedText + "']");
                        if(excTaxesInFlightPriceRS) {
                            for(var itax=0; itax < excTaxesInFlightPriceRS.Count; itax++) {
                                var taxNode = excTaxesInFlightPriceRS.GetItem(itax);
                                if (taxNode) {
                                    taxNode.SetAttribute("Paid", "PD");
                                    taxNode.SetAttribute("RFTax", "Y");
                                }
                            }
                        }
                    }
                }
            }
        }
        return parameters.domFlightPriceRS;
    }

    /**
     * Calculates AddCollect Amounts in Auto Exchange.
     * @param {{domFlightPriceRS: xxDomDocument, thisTravGroup: xxNode, newPriceNode: xxNode, oldPriceNode: xxNode, nettingApply: Boolean, domRequest: xxDomDocument}} parameters
     */
    function CreateAddCollectNode(parameters) {
        var issueDocValue = null;

        if(parameters.nodeParm_lookupFile)
            issueDocValue = parameters.nodeParm_lookupFile.SelectSingle("PenaltyInResidualFare[@IssueDoc]") ? parameters.nodeParm_lookupFile.SelectSingle("PenaltyInResidualFare").GetAttribute("IssueDoc") : "N";

        var exchangeInfoNode = parameters.thisTravGroup.SelectSingle("ExchangeInfo");

        if(exchangeInfoNode) {
            var nodeAddCollect = parameters.domFlightPriceRS.CreateElementNode("AdditionalCollection");

            var changeFee = exchangeInfoNode.SelectSingle("Penalty") ? Number(exchangeInfoNode.SelectSingle("Penalty").GetAttribute("Total")) : 0;
            var baseFareDiff = exchangeInfoNode.SelectSingle("ForFeitAmounts") ? 0 : Number(parameters.newPriceNode.SelectSingle("BaseFare").GetAttribute("Amount")) - Number(parameters.oldPriceNode.SelectSingle("BaseFare").GetAttribute("Amount"));

            var currCode = parameters.domFlightPriceRS.SelectSingle(parameters.domFlightPriceRS.Root, "FareGroup/CurrencyCode");
            if (currCode)
                nodeAddCollect.AppendChild(currCode.Clone());

            //Taxes node
            var nodeTaxes = parameters.domFlightPriceRS.CreateElementNode("Taxes");
            var totalAddCollectTaxAmount = 0;
            var newTaxNodes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[(not(@Paid))]");
            var refundTaxNodes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[(@Paid = \"RF\" and not(@Refundable))]");
            if (newTaxNodes || baseFareDiff > 0) {
                if (newTaxNodes) {
                for (var iTax = 0; iTax < newTaxNodes.Count; iTax++) {
                    var rfTaxes = 0;
                    var taxAmount = 0;
                    var thisTax = newTaxNodes.GetItem(iTax);
                    if (thisTax) {
                        if (thisTax.GetAttribute("Paid") == "RF") {

                            rfTaxes += -Math.abs(thisTax.GetAttribute("Amount"));
                        }
                        else
                            taxAmount = Math.abs(thisTax.GetAttribute("Amount"));

                        if (taxAmount || rfTaxes) {
                            var addCollTax = thisTax.Clone();
                            var thisTaxUsedCompAmount = thisTax.GetAttribute("UsedCompensated") ? thisTax.GetAttribute("UsedCompensated") : 0;
                            if (parameters.nettingApply) {
                                taxAmount = taxAmount < 0 ? 0 : taxAmount;
                                if (taxAmount > 0) {
                                    var refundedTaxes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[@Paid = \"RF\"]");
                                    if (!refundedTaxes) {
                                        addCollTax.SetAttribute("Amount", taxAmount.toString());
                                        totalAddCollectTaxAmount += Number(taxAmount);
                                        nodeTaxes.AppendChild(addCollTax);
                                    }
                                    else {
                                        for (var rfTax = 0; rfTax < refundedTaxes.Count; rfTax++) {
                                            var thisRFTax = refundedTaxes.GetItem(rfTax);
                                            var currentTaxAmount = thisTax.GetAttribute("Amount");
                                            var currentTaxUsedCompAmount = thisTax.GetAttribute("UsedCompensated") ? thisTax.GetAttribute("UsedCompensated") : 0;
                                            currentTaxAmount = Number(currentTaxAmount) - Number(currentTaxUsedCompAmount);

                                            if (thisRFTax && currentTaxUsedCompAmount != currentTaxAmount) {
                                                var taxPortionToUse = thisRFTax.GetAttribute("UsedCompensated") ? thisRFTax.GetAttribute("UsedCompensated") : 0;
                                                var amount = Number(thisRFTax.GetAttribute("Amount")) - Number(taxPortionToUse) ;
                                                //If there is still some amount to be used in the RF Tax then adjust the New tax Amount
                                                if (amount > 0) {
                                                    var previousTaxAmount = taxAmount;
                                                    if (Number(taxAmount) <= amount) {
                                                        var previousAmount = taxAmount;
                                                        taxAmount = taxAmount - amount;
                                                        var newUsedCompAmount = Number(previousAmount) + Number(taxPortionToUse);
                                                        if (taxAmount <= 0) {
                                                            thisRFTax.SetAttribute("UsedCompensated", newUsedCompAmount.toString());
                                                            thisTax.SetAttribute("UsedCompensated", thisTax.GetAttribute("Amount").toString());
                                                            taxAmount = 0;
                                                            addCollTax.SetAttribute("Amount", taxAmount.toString());
                                                        }
                                                        else{
                                                            //Mark how much was used from the RF Tax to paid the New Tax
                                                            thisTax.SetAttribute("UsedCompensated", Math.abs(amount).toString());
                                                            thisRFTax.SetAttribute("UsedCompensated", newUsedCompAmount.toString());
                                                        }

                                                    }
                                                    else { //Check if a New tax can be OffSet if there is some unused RF Tax amount= rfTaxAmount - rfTaxUsedComp
                                                        thisRFTax.SetAttribute("UsedCompensated", thisRFTax.GetAttribute("Amount"));
                                                        taxAmount = taxAmount - amount;
                                                        if((taxAmount > 0)) {
                                                            var RFAmountForUSedCom = thisRFTax.GetAttribute("UsedCompensated") ? Number(thisRFTax.GetAttribute("Amount")) - Number(thisRFTax.GetAttribute("UsedCompensated")) : 0;
                                                            var thisTaxNewUsedCompAmount = Number(thisTax.GetAttribute("UsedCompensated")) - Number(RFAmountForUSedCom);
                                                            if(thisTaxNewUsedCompAmount > 0)
                                                                thisTax.SetAttribute("UsedCompensated", thisTaxNewUsedCompAmount.toString());
                                                            else
                                                                thisTax.SetAttribute("UsedCompensated", thisTax.GetAttribute("Amount"));

                                                        }
                                                    }
                                                }
                                            }
                                        }
                                       if (taxAmount > 0) {
                                           if (thisTax.GetAttribute("UsedCompensated") != thisTax.GetAttribute("Amount")) {
                                               thisRFTax.SetAttribute("UsedCompensated", thisRFTax.GetAttribute("Amount").toString());
                                               thisTax.SetAttribute("UsedCompensated", amount.toString());
                                               addCollTax.SetAttribute("Amount", taxAmount.toString());
                                               nodeTaxes.AppendChild(addCollTax);
                                               totalAddCollectTaxAmount += Number(taxAmount);
                                           }
                                        }

                                    }
                                }
                            }
                            else {
                                if (thisTax.GetAttribute("Paid") != "RF") {
                                    taxAmount = thisTax.GetAttribute("Amount");
                                    totalAddCollectTaxAmount += Number(taxAmount);
                                    var addCollTax = thisTax.Clone();
                                    nodeTaxes.AppendChild(addCollTax);
                                }
                            }
                        }

                    }
                }
            }
                if (parameters.nettingApply) {
                    //If there is Add Collect BaseFare check if it can be off set with RF Taxes
                    var refundedTaxes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[(@Paid = \"RF\" and not(@Refundable))]");
                    if (baseFareDiff > 0 && refundTaxNodes && parameters.nettingApply) {
                        for (var rfTax = 0; rfTax < refundedTaxes.Count; rfTax++) {
                            var thisRFTax = refundedTaxes.GetItem(rfTax);
                            if (thisRFTax) {
                                var taxPortionToUse = thisRFTax.GetAttribute("UsedCompensated") ? thisRFTax.GetAttribute("UsedCompensated") : 0;
                                var amount = thisRFTax.GetAttribute("Amount");
                                if (amount) {
                                    if (Number(taxPortionToUse) < Number(amount)) {
                                        thisRFTax.SetAttribute("UsedCompensated", Math.abs(amount).toString());
                                        var previousAmount = baseFareDiff;
                                        baseFareDiff = baseFareDiff - (Number(amount) - Number(taxPortionToUse));
                                        if (baseFareDiff < 0) {
                                            var newUsedCompAmount = Number(previousAmount) + Number(taxPortionToUse);
                                            thisRFTax.SetAttribute("UsedCompensated", newUsedCompAmount.toString());
                                            baseFareDiff = 0;
                                            var addCollTax = thisTax.Clone();
                                            if(addCollTax) {
                                                addCollTax.SetAttribute("Amount", Math.abs(baseFareDiff).toString());
                                                nodeTaxes.AppendChild(addCollTax);
                                            }

                                        }
                                        else {
                                            var newUsedCompAmount = Number(amount);
                                            if(addCollTax) {
                                                addCollTax.SetAttribute("Amount", "0");
                                                nodeTaxes.AppendChild(addCollTax);
                                            }
                                            thisRFTax.SetAttribute("UsedCompensated", newUsedCompAmount.toString());
                                        }
                                    }
                                }
                            }
                        }
                    }
                    newTaxNodes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[(not(@Paid))]");
                    if (baseFareDiff < 0 && newTaxNodes && parameters.nettingApply) {
                        for (var iNewTax = 0; iNewTax < newTaxNodes.Count; iNewTax++) {
                            var thisNewTax = newTaxNodes.GetItem(iNewTax);
                            if (thisNewTax) {
                                var taxPortionToUse = thisNewTax.GetAttribute("UsedCompensated") ? thisNewTax.GetAttribute("UsedCompensated") : 0;
                                var amount = thisNewTax.GetAttribute("Amount");
                                if (amount) {
                                    if (Number(taxPortionToUse) < Number(amount)) {
                                        thisNewTax.SetAttribute("UsedCompensated", Math.abs(amount).toString());
                                        baseFareDiff = baseFareDiff < 0 ? Math.abs(baseFareDiff) - (Number(amount) - Number(taxPortionToUse)) : baseFareDiff - (Number(amount) - Number(taxPortionToUse));
                                        if (baseFareDiff < 0) {
                                            var newUsedCompAmount = Math.abs(baseFareDiff) - Number(taxPortionToUse);
                                            if (newUsedCompAmount > 0)
                                                thisNewTax.SetAttribute("UsedCompensated", amount.toString());
                                            else {
                                                thisNewTax.SetAttribute("UsedCompensated", amount.toString());
                                                baseFareDiff = 0;

                                            }

                                        }
                                        else {
                                            //var newUsedCompAmount = amount;
                                            baseFareDiff = -baseFareDiff;
                                            thisNewTax.SetAttribute("UsedCompensated", amount.toString());
                                            var taxDesignator = thisNewTax.SelectSingle("Designator") ? thisNewTax.SelectSingle("Designator").NormalizedText : "";
                                            var paxType = parameters.thisTravGroup.GetAttribute("TypeRequested");

                                            var addCollTax = thisNewTax.Clone();
                                            addCollTax.SetAttribute("Amount", "0");
                                            var previousAddCollectNode = nodeTaxes.SelectSingle("Tax[Designator = '"+ taxDesignator +"']");
                                            if(!previousAddCollectNode) {
                                                nodeTaxes.AppendChild(addCollTax);
                                                totalAddCollectTaxAmount += Number(amount);
                                            }
                                            else {
                                                nodeTaxes.ReplaceChild(addCollTax, previousAddCollectNode);
                                                totalAddCollectTaxAmount -= Number(previousAddCollectNode.GetAttribute("Amount"));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if(changeFee > 0) {
                        var refundedTaxes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[(@Paid = \"RF\" and not(@Refundable))]");
                        if(refundedTaxes){
                            for (var rfTax = 0; rfTax < refundedTaxes.Count; rfTax++) {
                                var thisRFTax = refundedTaxes.GetItem(rfTax);
                                if (thisRFTax) {
                                    var taxPortionToUse = thisRFTax.GetAttribute("UsedCompensated") ? thisRFTax.GetAttribute("UsedCompensated") : 0;
                                    var amount = Number(thisRFTax.GetAttribute("Amount")) - Number(taxPortionToUse);
                                    //If there is still some amount to be used in the RF Tax then adjust the New tax Amount
                                    if (amount > 0) {
                                        changeFee = Number(changeFee) - amount;
                                        if (changeFee <= 0) {
                                            var newUsedCompAmount = Math.abs(changeFee) + taxPortionToUse;
                                            thisRFTax.SetAttribute("UsedCompensated", newUsedCompAmount.toString());
                                            changeFee = 0;
                                        }
                                        else {
                                            thisRFTax.SetAttribute("UsedCompensated", thisRFTax.GetAttribute("Amount").toString());
                                        }
                                    }
                                }
                            }
                        }
                        if (baseFareDiff < 0 && changeFee > 0) {
                            baseFareDiff += Number(changeFee);
                            if(baseFareDiff <= 0)
                                changeFee = 0;
                            else {
                                changeFee = baseFareDiff;
                                baseFareDiff = 0;
                            }
                        }
                    }
                }
            }
            var unUsedBaseFareDiff = baseFareDiff < 0 ? baseFareDiff : 0;
            baseFareDiff = baseFareDiff > 0 ? baseFareDiff : 0;
            changeFee = changeFee > 0 ? changeFee : 0;

            if(exchangeInfoNode.SelectSingle("Penalty")){
                var ticketPenalty = exchangeInfoNode.SelectSingle("Penalty").GetAttribute("Total");
                if(ticketPenalty && (ticketPenalty != changeFee)) {
                    exchangeInfoNode.SelectSingle("Penalty").SetAttribute("Total", changeFee.toString());
                    if(changeFee == 0) {
                        exchangeInfoNode.SelectSingle("Penalty").SetAttribute("Amount", changeFee.toString());
                    }
                    else { //calculates Penalty Amount from Total Penalty and Tax Penalty Amount
                        var penaltyTaxAmount = exchangeInfoNode.SelectSingle("Penalty/Taxes/@Amount") ? exchangeInfoNode.SelectSingle("Penalty/Taxes").GetAttribute("Amount") : 0;
                        var newPenaltyAmount = Number(changeFee) - Number(penaltyTaxAmount);
                        exchangeInfoNode.SelectSingle("Penalty").SetAttribute("Amount", newPenaltyAmount.toString());
                    }
                }
            }
            //BaseFareDifference node
            var nodeBasefareDiff = parameters.domFlightPriceRS.CreateElementNode("BaseFareDifference");
            nodeBasefareDiff.AppendChild(parameters.domFlightPriceRS.CreateTextNode(baseFareDiff.toString()));
            nodeAddCollect.AppendChild(nodeBasefareDiff);

            //TotalAdditionalCollection node
            var nodeTotalAdditionalCollection = parameters.domFlightPriceRS.CreateElementNode("TotalAdditionalCollection");
            var totalAddCollect = (issueDocValue != null) && (issueDocValue == "N") ? baseFareDiff + totalAddCollectTaxAmount + changeFee : baseFareDiff + totalAddCollectTaxAmount;
            if (totalAddCollect < 0)
                totalAddCollect = 0;
            nodeTotalAdditionalCollection.AppendChild(parameters.domFlightPriceRS.CreateTextNode(totalAddCollect.toString()));
            nodeAddCollect.AppendChild(nodeTotalAdditionalCollection);

            var totalAddCollect_NoPenalty = baseFareDiff + totalAddCollectTaxAmount;
            nodeAddCollect.SetAttribute("Total", totalAddCollect_NoPenalty.toString());

            nodeTaxes.SetAttribute("Amount", Math.abs(totalAddCollectTaxAmount));
            nodeAddCollect.AppendChild(nodeTaxes);

            if (baseFareDiff != 0 || totalAddCollectTaxAmount != 0 || totalAddCollect != 0)
                exchangeInfoNode.AppendChild(nodeAddCollect);
        }
        CreateRefundNode({domFlightPriceRS: parameters.domFlightPriceRS, thisTravGroup: parameters.thisTravGroup, newPriceNode: parameters.newPriceNode, oldPriceNode: parameters.oldPriceNode, nettingApply: parameters.nettingApply, domTC: parameters.domTC, nodeParm_lookupFile: parameters.nodeParm_lookupFile, unUsedBaseFareDiff: unUsedBaseFareDiff});
    }

    /**
     * Calculates Refund Amounts in Auto Exchange.
     * @param {{domFlightPriceRS: xxDomDocument, thisTravGroup: xxNode, newPriceNode: xxNode, oldPriceNode: xxNode, nettingApply: Boolean, domTC: xxDomDocument, nodeParm_lookupFile: xxNode}} parameters
     */
    function CreateRefundNode(parameters) {

        var exchangeInfoNode = parameters.thisTravGroup.SelectSingle("ExchangeInfo");
        if(exchangeInfoNode) {

            var nodeRefund = parameters.domFlightPriceRS.CreateElementNode("Refund");
            var changeFee = exchangeInfoNode.SelectSingle("Penalty") ? Number(exchangeInfoNode.SelectSingle("Penalty").GetAttribute("Amount")) : 0;
            var baseFareDiff = parameters.unUsedBaseFareDiff;
            var taxesDiff = (Number(parameters.newPriceNode.SelectSingle("Taxes").GetAttribute("Amount")) - Number(parameters.oldPriceNode.SelectSingle("Taxes").GetAttribute("Amount"))) > 0 ? Number(parameters.newPriceNode.SelectSingle("Taxes").GetAttribute("Amount")) - Number(parameters.oldPriceNode.SelectSingle("Taxes").GetAttribute("Amount")) : 0;

            var currCode = parameters.domFlightPriceRS.SelectSingle(parameters.domFlightPriceRS.Root, "FareGroup/CurrencyCode");
            if (currCode)
                nodeRefund.AppendChild(currCode.Clone());

            //Taxes node
            var nodeTaxes = parameters.domFlightPriceRS.CreateElementNode("Taxes");
            var totalRefundTaxAmount = 0;
            var newTaxNodes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[@Paid = \"RF\" and not(@Refundable)]");
            var noPaidAttTaxNodes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[not(@Paid)]");
            if (newTaxNodes) {
                for (var iTax = 0; iTax < newTaxNodes.Count; iTax++) {
                    var thisTax = newTaxNodes.GetItem(iTax);
                    if (thisTax) {
                        var taxAmount;
                        var usedCompesatedAmount = thisTax.GetAttribute("UsedCompensated") ? thisTax.GetAttribute("UsedCompensated") : 0;
                        if (thisTax.GetAttribute("Paid") == "RF")
                            taxAmount = -Math.abs(thisTax.GetAttribute("Amount")) + Math.abs(usedCompesatedAmount);
                        else
                            taxAmount = Math.abs(thisTax.GetAttribute("Amount"));

                        if (taxAmount) {
                            var rfTax = thisTax.Clone();
                            if (parameters.nettingApply) {
                                nodeRefund.SetAttribute("NettingApplied", "Y");
                                if (baseFareDiff != 0 && noPaidAttTaxNodes) {
                                    if (baseFareDiff < 0 && taxAmount > 0) {
                                        baseFareDiff = baseFareDiff + Math.abs(taxAmount);
                                        if (baseFareDiff <= 0)
                                            taxAmount = 0;
                                    }
                                }
                                else {
                                    if (baseFareDiff <= 0 && noPaidAttTaxNodes == null)
                                        ;
                                    else
                                        taxAmount = Math.abs(taxAmount);
                                }
                                if (taxAmount > 0 && baseFareDiff <= 0) {
                                    var preFee = changeFee;
                                    changeFee -= Math.abs(taxAmount);
                                    if (changeFee > 0) {
                                        thisTax.SetAttribute("UsedCompensated", Math.abs(taxAmount).toString());
                                        taxAmount = 0;
                                    }
                                    else {
                                        thisTax.SetAttribute("UsedCompensated", Math.abs(preFee).toString());
                                        taxAmount = changeFee;
                                        changeFee = 0;
                                    }
                                }

                                if (taxAmount < 0 && changeFee > 0 && baseFareDiff <= 0) {
                                    var preFee = changeFee;
                                    changeFee -= Math.abs(taxAmount);
                                    if (changeFee > 0) {
                                        thisTax.SetAttribute("UsedCompensated", Math.abs(taxAmount).toString());
                                        taxAmount = 0;
                                    }
                                    else {
                                        thisTax.SetAttribute("UsedCompensated", Math.abs(preFee).toString());
                                        taxAmount = changeFee;
                                        changeFee = 0;
                                    }
                                }
                                totalRefundTaxAmount += taxAmount;
                                taxAmount = taxAmount < 0 ? Math.abs(taxAmount) : taxAmount;
                                rfTax.SetAttribute("Amount", taxAmount.toString());
                                nodeTaxes.AppendChild(rfTax);
                            }
                            else {
                                if (thisTax.GetAttribute("Paid") == "RF") {
                                    taxAmount = thisTax.GetAttribute("Amount");
                                    totalRefundTaxAmount += Number(taxAmount);
                                    nodeTaxes.AppendChild(thisTax.Clone());
                                }
                            }
                        }
                    }
                }
            }

            if (parameters.nettingApply) {
                if (baseFareDiff < 0 && changeFee > 0) {
                    nodeRefund.SetAttribute("NettingApplied", "Y");
                    changeFee += baseFareDiff;
                    if (changeFee >= 0)
                        baseFareDiff = 0;
                    else {
                        baseFareDiff = changeFee;
                        changeFee = 0;
                    }
                    parameters.thisTravGroup.SelectSingle("ExchangeInfo").SetAttribute("AppliedNetting", "Y");
                }

            }

            baseFareDiff = baseFareDiff < 0 ? Math.abs(baseFareDiff) : 0;

            nodeTaxes.SetAttribute("Amount", Math.abs(totalRefundTaxAmount.toString()));

            //BaseFareDifference node
            var nodeBasefareDiff = parameters.domFlightPriceRS.CreateElementNode("BaseFareDifference");
            nodeBasefareDiff.AppendChild(parameters.domFlightPriceRS.CreateTextNode(Math.abs(baseFareDiff).toString()));
            nodeRefund.AppendChild(nodeBasefareDiff);

            nodeRefund.SetAttribute("Total", (Math.abs(totalRefundTaxAmount) + Math.abs(baseFareDiff)).toString());

            nodeRefund.AppendChild(nodeTaxes);

            if (baseFareDiff != 0 || totalRefundTaxAmount != 0)
                exchangeInfoNode.AppendChild(nodeRefund);

            if (exchangeInfoNode.SelectSingle("Penalty")) {
                if (exchangeInfoNode.SelectSingle("Penalty/Taxes/Tax")) {
                    var taxAmount = exchangeInfoNode.SelectSingle("Penalty/Taxes").GetAttribute("Amount") ? exchangeInfoNode.SelectSingle("Penalty/Taxes").GetAttribute("Amount") : exchangeInfoNode.SelectSingle("Penalty/Taxes/Tax[1]").GetAttribute("Amount");
                    var taxTotalAmount = Number(changeFee) + Number(taxAmount);
                    exchangeInfoNode.SelectSingle("Penalty").SetAttribute("Total", taxTotalAmount.toString());
                }
                else
                    exchangeInfoNode.SelectSingle("Penalty").SetAttribute("Total", changeFee.toString());

                exchangeInfoNode.SelectSingle("Penalty").SetAttribute("Amount", changeFee.toString());
            }
            if (exchangeInfoNode.SelectSingle("Refund") && (exchangeInfoNode.SelectSingle("Refund").GetAttribute("Total") == "0"))
                exchangeInfoNode.SelectSingle("Refund").Delete();

            var ForfeitBSPExchange_Fare_Flag = "N";
            var ForfeitBSPExchange_Tax_Flag = "N";

            if (parameters.nodeParm_lookupFile) {
                ForfeitBSPExchange_Fare_Flag = parameters.nodeParm_lookupFile.SelectSingle("Forfeit/ForfeitBSPExchange/@AutoFare") ? parameters.nodeParm_lookupFile.SelectSingle("Forfeit/ForfeitBSPExchange").GetAttribute("AutoFare") : ForfeitBSPExchange_Fare_Flag;
                ForfeitBSPExchange_Tax_Flag = parameters.nodeParm_lookupFile.SelectSingle("Forfeit/ForfeitBSPExchange/@Taxes") ? parameters.nodeParm_lookupFile.SelectSingle("Forfeit/ForfeitBSPExchange").GetAttribute("Taxes") : ForfeitBSPExchange_Tax_Flag;

                var forfeitFareAmount = exchangeInfoNode.SelectSingle("ValueOfOldTicket/@ForfeitFareAmount") ? exchangeInfoNode.SelectSingle("ValueOfOldTicket").GetAttribute("ForfeitFareAmount") : null;
                var forfeitTaxAmount = exchangeInfoNode.SelectSingle("ValueOfOldTicket/@ForfeitTaxAmount") ? exchangeInfoNode.SelectSingle("ValueOfOldTicket").GetAttribute("ForfeitTaxAmount") : null;
                var forfeitTotalAmount = exchangeInfoNode.SelectSingle("ValueOfOldTicket/@ForfeitTotalAmount") ? exchangeInfoNode.SelectSingle("ValueOfOldTicket").GetAttribute("ForfeitTotalAmount") : null;

                if ((ForfeitBSPExchange_Fare_Flag == "Y" || ForfeitBSPExchange_Tax_Flag == "Y" || (forfeitFareAmount && forfeitTaxAmount && forfeitTotalAmount && (forfeitFareAmount == forfeitTotalAmount))) && (baseFareDiff > 0 || totalRefundTaxAmount > 0))
                    CreateForfeitedNode({
                        domFlightPriceRS: parameters.domFlightPriceRS,
                        exchangeInfoNode: exchangeInfoNode,
                        oldPriceNode: parameters.oldPriceNode,
                        domTC: this.domTC,
                        baseFareDiff: baseFareDiff,
                        totalRefundTaxAmount: totalRefundTaxAmount,
                        ForfeitBSPExchange_Fare_Flag: ForfeitBSPExchange_Fare_Flag,
                        ForfeitBSPExchange_Tax_Flag: ForfeitBSPExchange_Tax_Flag
                    });
                else {
                    //TotalCredit
                    var nodeTotalCredit = parameters.domFlightPriceRS.CreateElementNode("TotalCredit");
                    nodeTotalCredit.SetAttribute("Amount", (Math.abs(totalRefundTaxAmount) + Math.abs(baseFareDiff)).toString());
                    nodeRefund.AppendChild(nodeTotalCredit);
                }
            }
        }
    }


    /**
     * Calculates Netting Amounts in Auto Exchange.
     * @param {{domFlightPriceRS: xxDomDocument, thisTravGroup: xxNode, newPriceNode: xxNode, oldPriceNode: xxNode, nettingApply: Boolean, nodeParm_lookupFile: xxNode, penaltyNodeClone: xxNode}} parameters
     */
    function CreateNettingNode(parameters) {
        var exchangeInfoNode = parameters.thisTravGroup.SelectSingle("ExchangeInfo");
        var changeFee = exchangeInfoNode.SelectSingle("Penalty")? Number(exchangeInfoNode.SelectSingle("Penalty").GetAttribute("OriginalTotal")): 0;

        var baseFareDiff = exchangeInfoNode.SelectSingle("ForFeitAmounts") ? 0 : Number(parameters.newPriceNode.SelectSingle("BaseFare").GetAttribute("Amount")) - Number(parameters.oldPriceNode.SelectSingle("BaseFare").GetAttribute("Amount"));
        var taxesDiff = Number(parameters.newPriceNode.SelectSingle("Taxes").GetAttribute("Amount")) - Number(parameters.oldPriceNode.SelectSingle("Taxes").GetAttribute("Amount"));

        var nodeNettingCal = parameters.domFlightPriceRS.CreateElementNode("NettingCalculation");

        var currCode = parameters.domFlightPriceRS.SelectSingle(parameters.domFlightPriceRS.Root, "FareGroup/CurrencyCode");
        if (currCode)
            nodeNettingCal.AppendChild(currCode.Clone());

        //BaseFareDifference node
        var nodeBasefareDiff = parameters.domFlightPriceRS.CreateElementNode("BaseFareDifference");
        nodeBasefareDiff.AppendChild(parameters.domFlightPriceRS.CreateTextNode(baseFareDiff.toString()));
        nodeNettingCal.AppendChild(nodeBasefareDiff);

        //Taxes node
        var nodeTaxes = parameters.domFlightPriceRS.CreateElementNode("Taxes");
        var totalNettingTaxAmount = 0;

        var newTaxNodes = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode,"Taxes/Tax[not(@Paid = \"PD\")][not(@Refundable)]");
        if(newTaxNodes){
            for(var iTax=0; iTax < newTaxNodes.Count; iTax++) {
                var nettCalTax;
                var thisTax = newTaxNodes.GetItem(iTax);
                if (thisTax){
                    var currentNettingTaxAmount;
                    if(thisTax.GetAttribute("Paid") == "RF") {
                        currentNettingTaxAmount = -Math.abs(thisTax.GetAttribute("Amount"));
                        if(!(thisTax.GetAttribute("UsedCompensated")))
                            thisTax.SetAttribute("UsedCompensated", Math.abs(currentNettingTaxAmount).toString());
                    }
                    else
                        currentNettingTaxAmount = Math.abs(thisTax.GetAttribute("Amount"));

                    nettCalTax = thisTax.Clone();
                    nettCalTax.SetAttribute("Amount", currentNettingTaxAmount.toString());
                    totalNettingTaxAmount += currentNettingTaxAmount;
                }
                nodeTaxes.AppendChild(nettCalTax);
            }
        }
        nodeTaxes.SetAttribute("Amount", totalNettingTaxAmount.toString());
        var nettingCalTotal = baseFareDiff + totalNettingTaxAmount + changeFee;
        nodeNettingCal.SetAttribute("Total", nettingCalTotal.toString());

        nodeNettingCal.AppendChild(nodeTaxes);

        if(parameters.penaltyNodeClone) {
            var issueDocValue = parameters.nodeParm_lookupFile.SelectSingle("PenaltyInResidualFare[@IssueDoc]") ? parameters.nodeParm_lookupFile.SelectSingle("PenaltyInResidualFare").GetAttribute("IssueDoc") : "N";
            if(issueDocValue)
                exchangeInfoNode.SelectSingle("Penalty").SetAttribute("IssueDocument", issueDocValue);

            if(parameters.penaltyNodeClone.GetAttribute("OriginalTotal"))
                parameters.penaltyNodeClone.RemoveAttribute("OriginalTotal");
            if(parameters.penaltyNodeClone.GetAttribute("OriginalAmount"))
                parameters.penaltyNodeClone.RemoveAttribute("OriginalAmount");
            //Penalty node
            nodeNettingCal.AppendChild(parameters.penaltyNodeClone);
        }

        var lookupNodeDom = new xxDomDocument();
        if(lookupNodeDom.LoadXML(parameters.nodeParm_lookupFile.XML)){
            var taxesToExclude = lookupNodeDom.SelectNode(lookupNodeDom.Root, "NettingExcludeTaxes/TaxCode");
            if(taxesToExclude) {
                for(var taxIndex=0; taxIndex < taxesToExclude.Count; taxIndex++) {
                    var excTax = taxesToExclude.GetItem(taxIndex);
                    if (excTax) {
                        var excTaxesInFlightPriceRS = parameters.domFlightPriceRS.SelectNode(parameters.newPriceNode, "Taxes/Tax[@RFTax and Designator = '" + excTax.NormalizedText + "']");
                        if(excTaxesInFlightPriceRS) {
                            //NettingExcludeTaxes node
                            var nettingExcludeTaxesNode = parameters.domFlightPriceRS.CreateElementNode("NettingExcludeTaxes");
                            for(var itax=0; itax < excTaxesInFlightPriceRS.Count; itax++) {
                                var taxNode = excTaxesInFlightPriceRS.GetItem(itax);
                                if (taxNode) {
                                    taxNode.RemoveAttribute("RFTax");
                                    var taxNodeCloned = taxNode.Clone();
                                    taxNodeCloned.SetAttribute("Refundable", "N");
                                    taxNodeCloned.RemoveAttribute("Paid");
                                }
                                nettingExcludeTaxesNode.AppendChild(taxNodeCloned);
                            }
                            nodeNettingCal.AppendChild(nettingExcludeTaxesNode);
                        }
                    }
                }
            }
        }
        exchangeInfoNode.AppendChild(nodeNettingCal);
    }

    /**
     * Calculates Forfeited Amounts in Auto Exchange.
     * @param {{domFlightPriceRS: xxDomDocument, exchangeInfoNode: xxNode, oldPriceNode: xxNode, domTC: xxDomDocument, baseFareDiff: Number, , totalRefundTaxAmount: Number, ForfeitBSPExchange_Fare_Flag: xxNode, ForfeitBSPExchange_Tax_Flag: xxNode}} parameters
     */
    function CreateForfeitedNode(parameters) {

        var forFeitAmountNode = parameters.domFlightPriceRS.CreateElementNode("ForFeitAmounts");
        var decPlace = parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/CurrencyCode") ? parameters.domFlightPriceRS.Root.SelectSingle("FareGroup/CurrencyCode").GetAttribute("NumberOfDecimals") : "0";
        forFeitAmountNode.SetAttribute("NumberOFDecimals", decPlace);

        var forfeitFareAmount = parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket/@ForfeitFareAmount") ? parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket").GetAttribute("ForfeitFareAmount") : null;
        var forfeitTaxAmount = parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket/@ForfeitTaxAmount") ? parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket").GetAttribute("ForfeitTaxAmount") : null;
        var forfeitTotalAmount = parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket/@ForfeitTotalAmount") ? parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket").GetAttribute("ForfeitTotalAmount") : null;

        //Amount
        var amountNode = parameters.domFlightPriceRS.CreateElementNode("Amount");
        amountNode.AppendChild(parameters.domFlightPriceRS.CreateTextNode(parameters.oldPriceNode.GetAttribute("Total")));
        forFeitAmountNode.AppendChild(amountNode);

        //ForfeitFareAmount
        if(parameters.ForfeitBSPExchange_Fare_Flag == "Y" || (forfeitFareAmount == forfeitTotalAmount)) {
            var forfeitFareAmountNode = parameters.domFlightPriceRS.CreateElementNode("ForfeitFareAmount");
            forfeitFareAmountNode.AppendChild(parameters.domFlightPriceRS.CreateTextNode(parameters.baseFareDiff.toString()));
            forFeitAmountNode.AppendChild(forfeitFareAmountNode);
            parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket").SetAttribute("ForfeitFareAmount", parameters.baseFareDiff.toString());
        }

        //ForfeitTaxAmount. Don't create ForfeitTaxAmount node for Cat31.
        if(parameters.ForfeitBSPExchange_Tax_Flag == "Y" || ((!forfeitFareAmount && !forfeitTaxAmount && !forfeitTotalAmount) || (forfeitFareAmount != forfeitTotalAmount))) {
            var forfeitTaxAmountNode = parameters.domFlightPriceRS.CreateElementNode("ForfeitTaxAmount");
            forfeitTaxAmountNode.AppendChild(parameters.domFlightPriceRS.CreateTextNode(parameters.totalRefundTaxAmount.toString()));
            forFeitAmountNode.AppendChild(forfeitTaxAmountNode);
            parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket").SetAttribute("ForfeitTaxAmount", parameters.totalRefundTaxAmount.toString());
        }

        //ForfeitTotalAmount
        var forfeitTotalAmountNode = parameters.domFlightPriceRS.CreateElementNode("ForfeitTotalAmount");
        forfeitTotalAmountNode.AppendChild(parameters.domFlightPriceRS.CreateTextNode((Number(parameters.baseFareDiff) + Number(parameters.totalRefundTaxAmount)).toString()));
        forFeitAmountNode.AppendChild(forfeitTotalAmountNode);

        parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket").SetAttribute("ForfeitTotalAmount", (Number(parameters.baseFareDiff) + Number(parameters.totalRefundTaxAmount)).toString());
        parameters.exchangeInfoNode.SelectSingle("ValueOfOldTicket").SetAttribute("AllowForfeitBSPExchange", "Y");

        parameters.exchangeInfoNode.AppendChild(forFeitAmountNode);
    }

    /**
     * Reads lookup file to calculate the Forfeited values
     * @param {{domTC: xxDomDocument}} parameters
     * @returns {String}
     */
    function GetLookupFileName(domTC) {
        var fileName;
        var session = domTC.Root.SelectSingle("provider").GetAttribute("session")? domTC.Root.SelectSingle("provider").GetAttribute("session"): "";
        if(session != "PROD")
            fileName = "Ticket_Calculation_qastg";
        else
            fileName = "Ticket_Calculation";
        return fileName;
    }

    /**
     * Returns the Exchange node from the lookup file
     * @param {{domTC: xxDomDocument, vCarrier: String}} parameters
     * @returns {xxNode}
     */
    function CheckNettingNodeParm(parameters){
        var lookup = GetLookupDirectory();
        var file = lookup + GetLookupFileName(parameters.domTC) + ".xml";
        var Country = parameters.domTC.Root.SelectSingle("ACLInfo/Country")? parameters.domTC.Root.SelectSingle("ACLInfo/Country").NormalizedText: "";
        var data = LookupEx(file,Country);
        var cParmDom = new xxDomDocument();
        var nodRParmData = 0;
        var bApplyNet = false;

        if(data) {
            if(cParmDom.LoadXML(data)){
                var parmRoot = cParmDom.Root;
                if (parmRoot){
                    nodRParmData =  parmRoot.SelectSingle("data/ValidatingCarrier[@Cxr='" + parameters.vCarrier + "']/Exchange[@ApplyNetting]");
                    if(!nodRParmData)
                        nodRParmData = parmRoot.SelectSingle("data/ValidatingCarrier[@Cxr='YY']/Exchange[@ApplyNetting]");
                }
            }

        }
        if(!nodRParmData) {
            var strParmDefault = LookupEx(file, "DEFAULT");
            if (strParmDefault) {
                if (cParmDom.LoadXML(strParmDefault)) {
                    var parmDomRoot = cParmDom.Root;
                    if (parmDomRoot) {
                        nodRParmData = parmDomRoot.SelectSingle("data/ValidatingCarrier[@Cxr='" + parameters.vCarrier + "']/Exchange[@ApplyNetting]");
                        if (!nodRParmData)
                            nodRParmData = parmDomRoot.SelectSingle("data/ValidatingCarrier[@Cxr='" + "YY" + "']/Exchange[@ApplyNetting]");
                    }
                }
            }
        }
        return nodRParmData;
    }
    /**
     * DC FlightPrice response validation
     * @param {xxDomDocument} domFlightPriceRS
     */
    this.DCResponseValidation = function(domFlightPriceRS) {

        if(this.domServiceListRS)
            var nodeServicesCurrencyCode = this.domServiceListRS.Root.SelectSingle("OptionalServices/CurrencyCode");
        if (domFlightPriceRS.Root.Name != "FlightPriceRS")
            // renames response if is ONLY for services
            domFlightPriceRS.RenameRootName("FlightPriceRS");
        else
            // appends optional services
            if (this.gotServices)
                domFlightPriceRS.Root.SelectSingle("FareGroup").AppendChild(this.domServiceListRS.Root.SelectSingle("OptionalServices"));

        // appends informational messages from request validation
        var nsTexts = this.domRequest.SelectNodes(this.domRequest.Root, "InfoGroup/ForInfo/Text")
        if (nsTexts) {
            for (var indexText = 0; indexText < nsTexts.Count; indexText++)
                AddInfoGroup({domResponse: domFlightPriceRS, strText: nsTexts.GetItem(indexText).NormalizedText});
        }

        // groups TravelerGroup's
        var nsFareGroups = domFlightPriceRS.Root.Select("FareGroup");
        if (nsFareGroups)
            for (var indexFareGroup = 0; indexFareGroup < nsFareGroups.Count; indexFareGroup++) {
                var nodeFareGroup = nsFareGroups.GetItem(indexFareGroup);

                var nsTravelerGroups = nodeFareGroup.Select("TravelerGroup[./@TypeRequested and ./@TypePriced]");
                if (nsTravelerGroups)
                    for (var indexTravelerGroup = 0; indexTravelerGroup < nsTravelerGroups.Count; indexTravelerGroup++) {
                        var nodeTravelerGroup = nsTravelerGroups.GetItem(indexTravelerGroup);

                        // checks for non grouped TravelerGroup's
                        if (nodeTravelerGroup.SelectSingle("TravelerIDRef|TravelerElementNumber")) {
                            var nsMatchTravelerGroups = nodeFareGroup.Select("TravelerGroup[(./TravelerIDRef or ./TravelerElementNumber) and ./@TypeRequested = '" + nodeTravelerGroup.GetAttribute("TypeRequested") + "' and ./@TypePriced = '" + nodeTravelerGroup.GetAttribute("TypePriced") + "' and not(./TravelerIDRef = '" + nodeTravelerGroup.ValueOfSelect("TravelerIDRef") + "') and not(./TravelerElementNumber = '" + nodeTravelerGroup.ValueOfSelect("TravelerElementNumber") + "')]");
                            if (nsMatchTravelerGroups)
                                for (var indexMatchTravelerGroup = 0; indexMatchTravelerGroup < nsMatchTravelerGroups.Count; indexMatchTravelerGroup++) {
                                    var nodeMatchTravelerGroup = nsMatchTravelerGroups.GetItem(indexMatchTravelerGroup);

                                    var nsTravelers = nodeMatchTravelerGroup.Select("TravelerIDRef");
                                    if (nsTravelers)
                                        for (var indexTraveler = 0; indexTraveler < nsTravelers.Count; indexTraveler++) {
                                            var nodeTraveler = nsTravelers.GetItem(indexTraveler);

                                            if (nodeTravelerGroup.GetAttribute("TypeCount")) {
                                                var typeCount = Number(nodeTravelerGroup.GetAttribute("TypeCount")) + 1;

                                                // increments traveler count
                                                nodeTravelerGroup.SetAttribute("TypeCount", typeCount.toString());
                                                // increments total traveler amount
                                                if (nodeTravelerGroup.SelectSingle("Price[@Total]")) {
                                                    var typeTotalPrice = Number(nodeTravelerGroup.SelectSingle("Price").GetAttribute("Total")) * typeCount;

                                                    TraceXml("typeTotalPrice", "typeTotalPrice", typeTotalPrice.toString())
                                                    nodeFareGroup.SetAttribute("TotalPrice", (Number(nodeFareGroup.GetAttribute("TotalPrice")) - Number(nodeTravelerGroup.GetAttribute("TypeTotalPrice")) - Number(nodeMatchTravelerGroup.SelectSingle("Price").GetAttribute("Total")) + typeTotalPrice).toString());
                                                    nodeTravelerGroup.SetAttribute("TypeTotalPrice", typeTotalPrice.toString());
                                                }
                                            }

                                            // groups FeeGroup elements
                                            if (nodeMatchTravelerGroup.SelectSingle("FeeGroup")) {
                                                if (!nodeTravelerGroup.SelectSingle("FeeGroup"))
                                                    nodeTravelerGroup.AppendChild(nodeMatchTravelerGroup.SelectSingle("FeeGroup"));
                                                else {
                                                    var nodeFee = nodeMatchTravelerGroup.SelectSingle("FeeGroup/Fee[TravelerIDRef = \"" + nodeTraveler.ValueOfSelect(".") + "\"]");
                                                    nodeTravelerGroup.SelectSingle("FeeGroup").AppendChild(nodeFee);
                                                    nodeTravelerGroup.SelectSingle("FeeGroup").SetAttribute("Amount", Number(nodeTravelerGroup.SelectSingle("FeeGroup").GetAttribute("Amount")) + Number(nodeFee.ValueOfSelect("Amount")));
                                                }
                                            }

                                            // groups LoyaltyAccrual elements
                                            if (nodeMatchTravelerGroup.SelectSingle("FareRules/FareInfo/RelatedSegment/LoyaltyAccrual")) {
                                                var nsLoyaltyAccrual = nodeMatchTravelerGroup.Select("FareRules/FareInfo/RelatedSegment/LoyaltyAccrual");
                                                if(nsLoyaltyAccrual)
                                                    for (var indexLoyaltyAccrual = 0; indexLoyaltyAccrual < nsLoyaltyAccrual.Count; indexLoyaltyAccrual++) {
                                                        var nodeLoyaltyAccrual = nsLoyaltyAccrual.GetItem(indexLoyaltyAccrual);

                                                        nodeTravelerGroup.SelectSingle("FareRules/FareInfo/RelatedSegment[SegmentIDRef = \"" + nodeLoyaltyAccrual.Parent.ValueOfSelect("SegmentIDRef") + "\"]").AppendChild(nodeLoyaltyAccrual);
                                                    }
                                            }

                                            nodeTravelerGroup.SelectSingle("TravelerIDRef[last()]").InsertAfter(nodeTraveler);
                                        }
                                }
                        }
                        else
                            nodeTravelerGroup.Delete();
                    }
            }

        // validates pricing for services
        if (this.domRequest.Root.SelectSingle("PricingInfo[@PriceServicesOnly = \"Y\"]") && !domFlightPriceRS.Root.SelectSingle("FareGroup")) {
            if (this.domRequest.Root.SelectSingle("PNRViewRS/FareGroup")) {
                // returns FareGroup replacing re-priced services
                var nodeOptionalServices = domFlightPriceRS.CreateElementNode("OptionalServices");
                var nsServices = this.domRequest.SelectNodes(this.domRequest.Root, "OptionalServices/Service");
                if (nsServices) {
                    for (var indexService = 0; indexService < nsServices.Count; indexService++) {
                        var nodeService = nsServices.GetItem(indexService);

                        var strTravelerIDRef = nodeService.SelectSingle("TravelerIDRef").NormalizedText;
                        var nodeSegmentIDRef = nodeService.SelectSingle("SegmentIDRef");
                        var strServiceMethod = nodeService.GetAttribute("Method");
                        var strSubCode = nodeService.GetAttribute("SubCode");

                        var nodePricedService = null;
                        // services for COG scenarios
                        if (nodeSegmentIDRef && nodeSegmentIDRef.GetAttribute("ONPoint"))
                            nodePricedService = domFlightPriceRS.Root.SelectSingle("OptionalServices/Service[./@SubCode = \"" + strSubCode + "\" and ./SegmentIDRef = \"" + nodeSegmentIDRef.NormalizedText + "\" and ./SegmentIDRef/@ONPoint = \"" + nodeSegmentIDRef.GetAttribute("ONPoint")
                                + "\" and ./SegmentIDRef/@OFFPoint = \"" + nodeSegmentIDRef.GetAttribute("OFFPoint") + "\" and ./TravelerIDRef = \"" + strTravelerIDRef + "\"]");
                        // services for regular itineraries
                        else
                            nodePricedService = ((nodeService.GetAttribute("Method") == "ES") && !nodeSegmentIDRef)? domFlightPriceRS.Root.SelectSingle("OptionalServices/Service[./@SubCode = \"" + strSubCode + "\" and ./TravelerIDRef = \"" + strTravelerIDRef + "\"]"):
                                domFlightPriceRS.Root.SelectSingle("OptionalServices/Service[./@SubCode = \"" + strSubCode + "\" and ./SegmentIDRef = \"" + nodeSegmentIDRef.NormalizedText + "\" and ./TravelerIDRef = \"" + strTravelerIDRef + "\"]");

                        if (nodePricedService)
                            nodeOptionalServices.AppendChild(nodePricedService.Clone());
                        else
                            nodeOptionalServices.AppendChild(nodeService.Clone());
                    }

                    nodeService = nodeOptionalServices.SelectSingle("Service[SegmentIDRef]");
                }

                var nodeFareGroup = nodeService? this.domRequest.Root.SelectSingle("PNRViewRS/FareGroup[TravelerGroup/FareRules/FareInfo/RelatedSegment[SegmentIDRef = \"" + nodeService.SelectSingle("SegmentIDRef").NormalizedText + "\]]"): this.domRequest.Root.SelectSingle("PNRViewRS/FareGroup");
                nodeFareGroup = nodeFareGroup.Clone();

                if (nodeFareGroup.SelectSingle("OptionalServices"))
                    nodeFareGroup.ReplaceChild(nodeOptionalServices, nodeFareGroup.SelectSingle("OptionalServices"));
                else
                    nodeFareGroup.AppendChild(nodeOptionalServices);

                if(domFlightPriceRS.Root.SelectSingle("OptionalServices"))
                    domFlightPriceRS.Root.SelectSingle("OptionalServices").Delete();

                domFlightPriceRS.Root.AppendChild(nodeFareGroup);
            }
        }

        // checks ValidatingCarrier
        if (!domFlightPriceRS.Root.SelectSingle("FareGroup/ValidatingCarrier"))
            domFlightPriceRS.PutNode(domFlightPriceRS.Root.SelectSingle("FareGroup"), "ValidatingCarrier", this.airlineId);

        // validates services
        var nsServices = domFlightPriceRS.Root.Select("FareGroup/OptionalServices/Service|OptionalServices/Service");
        if (nsServices)
            for (indexService = (nsServices.Count - 1); indexService >= 0; indexService--) {
                nodeService = nsServices.GetItem(indexService);

                // common values
                var nodeTravelerIDRef = nodeService.SelectSingle("TravelerIDRef");
                var nsSegmentIDRefs = nodeService.Select("SegmentIDRef");
                var strSubCode = nodeService.GetAttribute("SubCode");
                var strRefKey = nodeService.GetAttribute("TrxRefKey");
                // matches service in the request in case it exists
                var nodeSelectedService = null;
                if (strSubCode && strRefKey)
                    nodeSelectedService = this.domRequest.Root.SelectSingle("OptionalServices/Service[./@SubCode = \"" + strSubCode + "\" and ./@TrxRefKey = \"" + strRefKey + "\"]");
                else {
                    if (strSubCode && nsSegmentIDRefs && nodeTravelerIDRef) {
                        var indexSegmentIDRef = 0;
                        while (indexSegmentIDRef < nsSegmentIDRefs.Count) {
                            var nodeSegmentIDRef = nsSegmentIDRefs.GetItem(indexSegmentIDRef);

                            if (this.domRequest.Root.SelectSingle("OptionalServices/Service[./@SubCode = \"" + strSubCode + "\" and ./TravelerIDRef = \"" + nodeTravelerIDRef.NormalizedText + "\" and ./SegmentIDRef = \"" + nodeSegmentIDRef.NormalizedText + "\"]")) {
                                nodeSelectedService = this.domRequest.Root.SelectSingle("OptionalServices/Service[./@SubCode = \"" + strSubCode + "\" and ./TravelerIDRef = \"" + nodeTravelerIDRef.NormalizedText + "\" and ./SegmentIDRef = \"" + nodeSegmentIDRef.NormalizedText + "\"]");

                                indexSegmentIDRef = nsSegmentIDRefs.Count;
                            }
                            else
                                indexSegmentIDRef++
                        }
                    }
                }

                // adding currency
                var nodeServicePrice = nodeService.SelectSingle("ServicePrice");
                if (nodeServicePrice) {
                    var nodeCurrencyCode = nodeServicePrice.SelectSingle("CurrencyCode") ? nodeServicePrice.SelectSingle("CurrencyCode") : nodeServicesCurrencyCode;
                    if (nodeCurrencyCode && !nodeServicePrice.SelectSingle("CurrencyCode"))
                        nodeServicePrice.AppendChild(nodeCurrencyCode.Clone());
                }

                // checks quantity and updates values and amounts in current service
                if (nodeService.GetAttribute("MaxQuantity") && (nodeService.GetAttribute("Type") != "Included")) {
                    // deletes service if it's included
                    if (nodeService.SelectSingle("Amount[text() = \"incl\"]")) {
                        nodeService.Delete();

                        continue;
                    }

                    // adds Quantity from request
                    var strQuantity = (nodeSelectedService && nodeSelectedService.GetAttribute("Quantity"))? nodeSelectedService.GetAttribute("Quantity"): "1";
                    nodeService.SetAttribute("Quantity", strQuantity);

                    // adds required user input from request
                    if (nodeSelectedService) {
                        var nodeRequestedUserText = nodeSelectedService.SelectSingle("BookingInstructions/UserInput/UserText[text()]");
                        var nodeUserText = nodeService.SelectSingle("BookingInstructions/UserInput/UserText[not(text()) and @Required = 'Y']");
                        if (nodeRequestedUserText && nodeUserText)
                            nodeUserText.ReplaceText({domXML: domFlightPriceRS, strValue: nodeRequestedUserText.NormalizedText});
                    }

                    var numberOfDecimals = Number(nodeCurrencyCode.GetAttribute("NumberOfDecimals"));
                    if (nodeServicePrice) {
                        // deletes current ItemPrice
                        if (nodeServicePrice.SelectSingle("ItemPrice"))
                            nodeServicePrice.SelectSingle("ItemPrice").Delete();

                        // creates new ItemPrice
                        var nodeItemPrice = domFlightPriceRS.CreateElementNode("ItemPrice");
                        nodeItemPrice.SetAttribute("Total", nodeServicePrice.GetAttribute("Total"));

                        if ((nodeService.SelectSingle("Attributes/SubGroup/Code")) && ((nodeService.SelectSingle("Attributes/SubGroup/Code")).NormalizedText == "XS"))
                            nodeItemPrice.SetAttribute("Unit", "K");
                        else if(nodeService.SelectSingle("Baggage/MaxWeight") && nodeService.SelectSingle("Baggage/MaxWeight").GetAttribute("Unit")) {
                            if(nodeService.SelectSingle("Baggage/MaxWeight").GetAttribute("Unit") == "KG")
                                nodeItemPrice.SetAttribute("Unit", "K");
                            else
                                nodeItemPrice.SetAttribute("Unit", "L");
                        }
                        else
                            nodeItemPrice.SetAttribute("Unit", "P");

                        nodeItemPrice.AppendChild(nodeCurrencyCode.Clone());
                        nodeItemPrice.AppendChild(nodeServicePrice.SelectSingle("BasePrice").Clone());
                        nodeServicePrice.AppendChild(nodeItemPrice);

                        // creates Quantity
                        var nodeQuantity = domFlightPriceRS.CreateElementNode("Quantity");
                        var nodeTextQuantity = domFlightPriceRS.CreateTextNode(strQuantity);
                        nodeQuantity.AppendChild(nodeTextQuantity);
                        nodeServicePrice.AppendChild(nodeQuantity);

                        // updates amounts
                        nodeServicePrice.SetAttribute("Total", (Number(nodeServicePrice.GetAttribute("Total")) * Number(strQuantity)).toString());
                        if (nodeService.SelectSingle("Amount"))
                            nodeService.SelectSingle("Amount").ReplaceText({domXML: domFlightPriceRS, strValue: (Number(nodeService.SelectSingle("Amount").NormalizedText)* Number(strQuantity)).toFixed(numberOfDecimals).toString()});
                        if (nodeServicePrice.SelectSingle("BasePrice[@Amount]"))
                            nodeServicePrice.SelectSingle("BasePrice").SetAttribute("Amount", (Number(nodeServicePrice.SelectSingle("BasePrice").GetAttribute("Amount")) * Number(strQuantity)).toString());
                        var nodeTaxes = nodeServicePrice.SelectSingle("Taxes");
                        if (nodeTaxes) {
                            nodeItemPrice.AppendChild(nodeTaxes.Clone());
                            if (nodeTaxes.GetAttribute("Amount"))
                                nodeTaxes.SetAttribute("Amount", (Number(nodeTaxes.GetAttribute("Amount")) * Number(strQuantity)).toString());

                            var nsTaxes =  nodeTaxes.Select("Tax[@Amount]");
                            if (nsTaxes)
                                for (var indexTax = 0; indexTax < nsTaxes.Count; indexTax++)
                                    nsTaxes.GetItem(indexTax).SetAttribute("Amount", (Number(nsTaxes.GetItem(indexTax).GetAttribute("Amount")) * Number(strQuantity)).toString());
                        }
                    }
                }

                // disallows Refund and Reuse
                if(nodeService.SelectSingle("Rules/Category[@Type = \"Refund\" or @Type = \"Reusable\"]")) {
                    var nodeAllowed = nodeService.SelectSingle("Rules/Category/Allowed");
                    if (nodeAllowed && nodeAllowed.NormalizedText == "N") {
                        var nodePenalties = nodeService.SelectSingle("Penalties");
                        if (!nodePenalties)
                            nodePenalties = domFlightPriceRS.PutNode(nodeService, "Penalties");
                        if (nodeAllowed.Parent.GetAttribute("Type") == "Refund")
                            nodePenalties.SetAttribute("Refundable", "N");
                        if (nodeAllowed.Parent.GetAttribute("Type") == "Reusable")
                            nodePenalties.SetAttribute("Reusable", "N");
                    }
                }

                // adds Commission when returned
                if(nodeService.SelectSingle("Rules/Category[./@Name = \"Commissions\" and not(./Commission)]")) {

                    var nodeCommission  = domFlightPriceRS.CreateElementNode("Commission");
                    var nodeCommissionText = domFlightPriceRS.CreateTextNode(nodeService.SelectSingle("Rules/Category[@Name = \"Commissions\"]").GetAttribute("Value"));
                    if (nodeService.SelectSingle("Rules/Category[@Name = \"Commissions\"]").GetAttribute("Code"))
                        if(nodeService.SelectSingle("Rules/Category[@Name = \"Commissions\"]").GetAttribute("Code") == "Percent")
                            nodeCommission.SetAttribute("Type", "P");
                        else
                            nodeCommission.SetAttribute("Type", "A");

                    nodeCommission.SetAttribute("CommissionSource", "X");
                    nodeCommission.AppendChild(nodeCommissionText);
                    nodeService.AppendChild(nodeCommission);
                }

                // adds the EMDS at the FlightPriceRS/OptionalServices along with the existing FareGroup
                if ((nodeService.GetAttribute("Method") == "ES") && domFlightPriceRS.Root.SelectSingle("FareGroup")) {
                    var nodeOptionalServices = domFlightPriceRS.Root.SelectSingle("OptionalServices");
                    if (!nodeOptionalServices)
                        nodeOptionalServices = domFlightPriceRS.PutNode(domFlightPriceRS.Root, "OptionalServices");

                    nodeOptionalServices.AppendChild(nodeService);
                }
            }

        // adds ONLY seats services if passed in the request and not returned in response
        var nsSeatServices = this.domRequest.Root.Select("OptionalServices/Service[DescriptionVariable]");
        if (nsSeatServices && !this.domRequest.Root.SelectSingle("OriginDestination/Flight[SeatMap]") && !domFlightPriceRS.Root.SelectSingle("FareGroup/OptionalServices/Service[DescriptionVariable]")) {
            for (var indexSeatServices = 0; indexSeatServices < nsSeatServices.Count; indexSeatServices++) {
                var nodeSeatService = nsSeatServices.GetItem(indexSeatServices).Clone();
                var nodePNRSeatService = this.domRequest.Root.SelectSingle("PNRViewRS/FareGroup/OptionalServices/Service[ServiceElementNumber = \"" + nodeSeatService.GetAttribute("AssociationID") + "\"]");

                var strSubCode = nodeSeatService.GetAttribute("SubCode");
                var strTravelerIDRef = nodeSeatService.SelectSingle("TravelerIDRef").NormalizedText;
                var nodeSegmentIDRef = nodeSeatService.SelectSingle("SegmentIDRef");
                // checks if the seat service was not returned
                var nodeServiceInResponse = ((nodeSeatService.GetAttribute("Method") == "ES") && !nodeSegmentIDRef)? domFlightPriceRS.Root.SelectSingle("FareGroup/OptionalServices/Service[./TravelerIDRef = \"" + strTravelerIDRef + "\" and " + "./@SubCode = \"" + strSubCode + "\"]"):
                    domFlightPriceRS.Root.SelectSingle("FareGroup/OptionalServices/Service[./SegmentIDRef = \"" + nodeSegmentIDRef.NormalizedText + "\" and " + "./TravelerIDRef = \"" + strTravelerIDRef + "\" and " + "./@SubCode = \"" + strSubCode + "\"]");
                if (!nodeServiceInResponse) {
                    var nodeOptionalServices = domFlightPriceRS.Root.SelectSingle("FareGroup/OptionalServices");
                    // creates OptionalServices element if missing
                    if (!nodeOptionalServices) {
                        nodeOptionalServices = domFlightPriceRS.CreateElementNode("OptionalServices");
                        domFlightPriceRS.Root.SelectSingle("FareGroup").AppendChild(nodeOptionalServices);
                    }

                    // renames and deletes non schema compliant elements
                    if (nodePNRSeatService) {
                        if (nodePNRSeatService.SelectSingle("SegmentElementNumber")) nodePNRSeatService.SelectSingle("SegmentElementNumber").Rename("SegmentIDRef");
                        if (nodePNRSeatService.SelectSingle("TravelerElementNumber")) nodePNRSeatService.SelectSingle("TravelerElementNumber").Rename("TravelerIDRef");
                        if (nodePNRSeatService.SelectSingle("ServiceElementNumber")) nodePNRSeatService.SelectSingle("ServiceElementNumber").Delete();
                    }

                    // appends seat service in response from PNR
                    nodeOptionalServices.AppendChild(nodeSeatService);
                }
            }
        }

        // deletes OptionalServices if empty
        if (domFlightPriceRS.Root.SelectSingle("FareGroup/OptionalServices[not(Service)]"))
            domFlightPriceRS.Root.SelectSingle("FareGroup/OptionalServices").Delete();

        // deletes CurrencyConversions
        var nodeCurrencyConversions = domFlightPriceRS.Root.SelectSingle("CurrencyConversions");
        if (nodeCurrencyConversions)
            nodeCurrencyConversions.Delete();

        // validates AutoExchange
        if (this.IsAutoExchange() && (this.domRequest.Root.GetAttribute("ndcAPI") == "NDC" || domFlightPriceRS.Root.SelectSingle("FareGroup[@SolutionType != \"T\" or not(@SolutionType)]"))) {
            if (this.domRequest.Root.SelectSingle("PricingInfo/FareCacheKey") && (this.domRequest.Root.GetAttribute("Context") == "PNRCreateRQ")) {
                var nsFlownSegments = domFlightPriceRS.SelectNodes(domFlightPriceRS.Root, "FareGroup/TravelerGroup/FareRules/FareInfo/RelatedSegment/SegmentIDRef[@FlownIndicator = 'Y']");
                if (nsFlownSegments)
                    for (var indexRelatedSegments = 0; indexRelatedSegments < nsFlownSegments.Count; indexRelatedSegments++) {
                        var nsSegIdRef = nsFlownSegments.GetItem(indexRelatedSegments);
                        if (nsSegIdRef) {
                            var nsBaggageData = domFlightPriceRS.Root.SelectSingle("FareGroup/BaggageData[Allowance/SegmentIDRef = \"" + nsSegIdRef.NormalizedText + "\" or CarryOnAllowance/SegmentIDRef = \"" + nsSegIdRef.NormalizedText + "\" or Bags/Bag/SegmentIDRef = \"" + nsSegIdRef.NormalizedText + "\"]");
                            if (nsBaggageData)
                                nsBaggageData.Delete();
                        }
                        nsFlownSegments.GetItem(indexRelatedSegments).Parent.Delete();
                    }

                var nsEmptyFareInfos = domFlightPriceRS.SelectNodes(domFlightPriceRS.Root, "FareGroup/TravelerGroup/FareRules/FareInfo[not(RelatedSegment)]");
                if (nsEmptyFareInfos)
                    for (var indexEmptyFareInfos = 0; indexEmptyFareInfos < nsEmptyFareInfos.Count; indexEmptyFareInfos++)
                        nsEmptyFareInfos.GetItem(indexEmptyFareInfos).Delete();
            }

            // calculates PD, RF and New Taxes if not present in the response
             if (!domFlightPriceRS.Root.SelectSingle("FareGroup/TravelerGroup/Price/Taxes/Tax/@Paid") && (this.domTC.Root.SelectSingle("ACLInfo/TktReporting").NormalizedText == "BSP" || this.IsAppSettingEnabled("NDCExternalExchangeCalc")) && domFlightPriceRS.Root.SelectSingle("FareGroup[@SolutionType != \"T\" or not(@SolutionType)]"))
                 domFlightPriceRS = this.CalculateAddCollectTaxes({domFlightPriceRS: domFlightPriceRS, domRequest: this.domRequest, domTC: this.domTC});

            //Netting calculation
            var domRequest = new xxDomDocument();
            if(domRequest.LoadXML(this.requestXML) && !domRequest.Root.SelectSingle("PricingInfo/FareCacheKey") && (this.domTC.Root.SelectSingle("ACLInfo/TktReporting").NormalizedText == "BSP" || this.IsAppSettingEnabled("NDCExternalExchangeCalc")))
                domFlightPriceRS = ApplyNetting({domFlightPriceRS: domFlightPriceRS, domRequest: domRequest, domTC: this.domTC});
			
			//Adds ReshopDifferential
			if(this.IsAppSettingEnabled("NDCExternalExchangeCalc")) {
				buildReshopDifferential({domFlightPriceRS: domFlightPriceRS, domRequest: this.domRequest});
				if(this.domTC.Root.ValueOfSelect("ACLInfo/TktReporting") != "BSP")
					removeRefundTaxes(domFlightPriceRS.Root.Select("FareGroup/TravelerGroup/Price/Taxes/Tax"));
			}

            if (!domFlightPriceRS.Root.SelectSingle("FareGroup/FareCacheKey") && domFlightPriceRS.Root.SelectSingle("FareGroup"))
                this.StorePriceInCache(domFlightPriceRS);

        }

        // Fill out missing prices
        var nodeFareGroup = domFlightPriceRS.Root.SelectSingle("FareGroup");
        if (nodeFareGroup && !nodeFareGroup.GetAttribute("TotalPrice")) {
            var totalLowestPrice = 0;
            var totalHigestPrice = 0;

            var nsTravelerGroups = domFlightPriceRS.Root.Select("FareGroup/TravelerGroup[./PriceRange and ./TravelerIDRef]");
            if (nsTravelerGroups)
                for (var indexTravelerGroup = 0; indexTravelerGroup < nsTravelerGroups.Count; indexTravelerGroup++) {
                    var nodeTravelerGroup = nsTravelerGroups.GetItem(indexTravelerGroup);

                    var typeLowestPrice = 0;
                    var typeHigestPrice = 0;
                    var nodePriceRange = nodeTravelerGroup.SelectSingle("PriceRange");
                    var nsTravelerIDRefs = nodeTravelerGroup.Select("TravelerIDRef");
                    var strTravelerIDRef = nsTravelerIDRefs.GetItem(0).NormalizedText;

                    var nsODs = nodeFareGroup.Select("OriginDestination");
                    if (nsODs)
                        for (var indexOD = 0; indexOD < nsODs.Count; indexOD++) {
                            var nodeOD = nsODs.GetItem(indexOD);

                            var boundLowestPrice = 0;
                            var boundHigestPrice = 0;
                            var nsPriceClasses = nodeOD.Select("Flight/PriceGroup/PriceClass");
                            if (nsPriceClasses)
                                for (var indexPriceClass = 0; indexPriceClass < nsPriceClasses.Count; indexPriceClass++) {
                                    var totalPriceClass = Number(nsPriceClasses.GetItem(indexPriceClass).SelectSingle("Price[./@Total and ./TravelerIDRef = \"" + strTravelerIDRef + "\"]").GetAttribute("Total"));

                                    // updates highest
                                    if (totalPriceClass > boundHigestPrice) boundHigestPrice = totalPriceClass;

                                    // updates lowest
                                    if ((totalPriceClass < boundLowestPrice) || (boundLowestPrice == 0)) boundLowestPrice = totalPriceClass;
                                }

                            typeLowestPrice += boundLowestPrice;
                            typeHigestPrice += boundHigestPrice;
                        }

                    nodePriceRange.SetAttribute("LowestPrice", typeLowestPrice);
                    nodePriceRange.SetAttribute("HighestPrice", typeHigestPrice);

                    nodeTravelerGroup.SetAttribute("TypeTotalPrice", (typeLowestPrice * nsTravelerIDRefs.Count));
                    nodeTravelerGroup.SetAttribute("TypeTotalHighest", (typeHigestPrice * nsTravelerIDRefs.Count));
                    nodeTravelerGroup.SetAttribute("TypeTotalLowest", (typeLowestPrice * nsTravelerIDRefs.Count));

                    totalLowestPrice += (typeLowestPrice * nsTravelerIDRefs.Count);
                    totalHigestPrice += (typeHigestPrice * nsTravelerIDRefs.Count);
                }

            nodeFareGroup.SetAttribute("TotalLowestPrice", totalLowestPrice);
            nodeFareGroup.SetAttribute("TotalHighestPrice", totalHigestPrice);
            nodeFareGroup.SetAttribute("TotalPrice", totalLowestPrice);
        }

        this.BaseResponseValidation(domFlightPriceRS);
    };

    /**
     * Builds ReshopDifferential node for each TravelerGroup in the FlightPriceRS
     * @param {{domFlightPriceRS: xxDomDocument, domRequest: xxDomDocument}} parameters
     */
    var buildReshopDifferential = function(parameters) {
        var nsTravelerGroups = parameters.domFlightPriceRS.Root.Select("FareGroup/TravelerGroup[./ExchangeInfo]");
        if (nsTravelerGroups)
            for (var indexTravelerGroup = 0; indexTravelerGroup < nsTravelerGroups.Count; indexTravelerGroup++) {
                var nodeTravelerGroup = nsTravelerGroups.GetItem(indexTravelerGroup);
                var nodeReshopDifferential = parameters.domFlightPriceRS.CreateElementNode("ReshopDifferential");

                var paxType = nodeTravelerGroup.GetAttribute("TypeRequested");
                var nodeOriginalTravelerGroup = parameters.domRequest.Root.SelectSingle("TicketImageRS/TicketImage/FareGroup/TravelerGroup[@TypeRequested = '" + paxType + "']");
                if(nodeOriginalTravelerGroup)
                    nodeReshopDifferential.AppendChild(buildOriginalOrderItem({domFlightPriceRS: parameters.domFlightPriceRS, nodeTravelerGroup: nodeOriginalTravelerGroup, indexTravelerGroup: indexTravelerGroup}));
                if(nodeTravelerGroup.SelectSingle("Price"))
                    nodeReshopDifferential.AppendChild(buildNewOfferItem({domFlightPriceRS: parameters.domFlightPriceRS, nodeTravelerGroup: nodeTravelerGroup, indexTravelerGroup: indexTravelerGroup}));
                if(nodeTravelerGroup.SelectSingle("ExchangeInfo/Penalty"))
                    nodeReshopDifferential.AppendChild(buildPenaltyAmount({domFlightPriceRS: parameters.domFlightPriceRS, nodeTravelerGroup: nodeTravelerGroup, indexTravelerGroup: indexTravelerGroup}));
                if(nodeTravelerGroup.SelectSingle("FeeGroup"))
                    nodeReshopDifferential.AppendChild(buildFeesAmount({domFlightPriceRS: parameters.domFlightPriceRS, nodeTravelerGroup: nodeTravelerGroup, indexTravelerGroup: indexTravelerGroup}));
                nodeReshopDifferential.AppendChild(buildReshopDue({domFlightPriceRS: parameters.domFlightPriceRS, nodeTravelerGroup: nodeTravelerGroup, indexTravelerGroup: indexTravelerGroup}));

                nodeTravelerGroup.AppendChild(nodeReshopDifferential);
            }
    };

    /**
     * Builds buildOriginalOrderItem node for ReshopDifferential node
     * @param {{domFlightPriceRS: xxDomDocument, nodeTravelerGroup: xxNode, indexTravelerGroup: Number}} parameters
     * @return xxNode
     */
    var buildOriginalOrderItem = function(parameters) {
        var nodeOriginalOrderItem = parameters.domFlightPriceRS.CreateElementNode("OriginalOrderItem");
        nodeOriginalOrderItem.AppendChild(buildNodeTotal({domFlightPriceRS: parameters.domFlightPriceRS, seqNumber: parameters.indexTravelerGroup + 1, code: parameters.nodeTravelerGroup.ValueOfSelect("../CurrencyCode"), amount: parameters.nodeTravelerGroup.SelectSingle("Price/BaseFare").GetAttribute("Amount"), amountType: null, purpose: "Base"}));

        if (parameters.nodeTravelerGroup.SelectSingle("Price/Taxes/Tax"))
            nodeOriginalOrderItem.AppendChild(nodeTaxes = buildNodeTaxes({domFlightPriceRS: parameters.domFlightPriceRS, nodeSource: parameters.nodeTravelerGroup.SelectSingle("Price"), isByAirline: null, nodeTaxes: null}));

        return nodeOriginalOrderItem;
    };

    /**
     * Builds buildNewOfferItem node for ReshopDifferential node
     * @param {{domFlightPriceRS: xxDomDocument, nodeTravelerGroup: xxNode, indexTravelerGroup: Number}} parameters
     * @return xxNode
     */
    var buildNewOfferItem = function(parameters) {
        var nodeNewOfferItem = parameters.domFlightPriceRS.CreateElementNode("NewOfferItem");
        nodeNewOfferItem.AppendChild(buildNodeTotal({domFlightPriceRS: parameters.domFlightPriceRS, seqNumber: parameters.indexTravelerGroup + 1, code: parameters.nodeTravelerGroup.ValueOfSelect("../CurrencyCode"), amount: parameters.nodeTravelerGroup.SelectSingle("Price/BaseFare").GetAttribute("Amount"), amountType: null, purpose: "Base"}));

        if (parameters.nodeTravelerGroup.SelectSingle("Price/Taxes/Tax"))
            nodeNewOfferItem.AppendChild(nodeTaxes = buildNodeTaxes({domFlightPriceRS: parameters.domFlightPriceRS, nodeSource: parameters.nodeTravelerGroup.SelectSingle("Price"), isByAirline: null, nodeTaxes: null}));

        return nodeNewOfferItem;
    };

    /**
     * Builds buildPenaltyAmount node for ReshopDifferential node
     * @param {{domFlightPriceRS: xxDomDocument, nodeTravelerGroup: xxNode, indexTravelerGroup: Number}} parameters
     * @return xxNode
     */
    var buildPenaltyAmount = function(parameters) {
        var nodePenaltyAmount = parameters.domFlightPriceRS.CreateElementNode("PenaltyAmount");
        nodePenaltyAmount.AppendChild(buildNodeTotal({domFlightPriceRS: parameters.domFlightPriceRS, seqNumber: parameters.indexTravelerGroup + 1, code: null, amount: parameters.nodeTravelerGroup.SelectSingle("ExchangeInfo/Penalty").GetAttribute("Amount"), amountType: null, purpose: null}));

        if (parameters.nodeTravelerGroup.SelectSingle("ExchangeInfo/Penalty/Taxes/Tax"))
            nodePenaltyAmount.AppendChild(nodeTaxes = buildNodeTaxes({domFlightPriceRS: parameters.domFlightPriceRS, nodeSource: parameters.nodeTravelerGroup.SelectSingle("ExchangeInfo/Penalty"), isByAirline: null, nodeTaxes: null}));

        return nodePenaltyAmount;
    };

    /**
     * Builds buildFeesAmount node for ReshopDifferential node
     * @param {{domFlightPriceRS: xxDomDocument, nodeTravelerGroup: xxNode, indexTravelerGroup: Number}} parameters
     * @return xxNode
     */
    var buildFeesAmount = function(parameters) {
        var nodeFeesAmount = parameters.domFlightPriceRS.CreateElementNode("FeesAmount");
        nodeFeesAmount.AppendChild(buildNodeTotal({domFlightPriceRS: parameters.domFlightPriceRS, seqNumber: parameters.indexTravelerGroup + 1, code: null, amount: parameters.nodeTravelerGroup.SelectSingle("FeeGroup").GetAttribute("Amount"), amountType: null, purpose: null}));

        if (parameters.nodeTravelerGroup.SelectSingle("FeeGroup/Fee/Taxes/Tax"))
            nodeFeesAmount.AppendChild(nodeTaxes = buildNodeTaxes({domFlightPriceRS: parameters.domFlightPriceRS, nodeSource: parameters.nodeTravelerGroup.SelectSingle("FeeGroup/Fee"), isByAirline: null, nodeTaxes: null}));

        return nodeFeesAmount;
    };

    /**
     * Builds buildReshopDue node for ReshopDifferential node
     * @param {{domFlightPriceRS: xxDomDocument, nodeTravelerGroup: xxNode, isByAirline: Boolean, indexTravelerGroup: Number}} parameters
     * @return xxNode
     */
    var buildReshopDue = function(parameters) {
        var nodeReshopDue = parameters.domFlightPriceRS.CreateElementNode("ReshopDue");

        var nodeAdditionalCollection = parameters.nodeTravelerGroup.SelectSingle("ExchangeInfo/AdditionalCollection");
        var nodeRefund = parameters.nodeTravelerGroup.SelectSingle("ExchangeInfo/Refund");
        if (nodeAdditionalCollection && (nodeAdditionalCollection.SelectSingle("BaseFareDifference[not (./ = '0')]") || !(nodeRefund && nodeRefund.SelectSingle("BaseFareDifference[not (./ = '0')]")))) {
            var nodeByPassenger = parameters.domFlightPriceRS.CreateElementNode("ByPassenger");
            nodeByPassenger.AppendChild(buildNodeTotal({domFlightPriceRS: parameters.domFlightPriceRS, seqNumber: parameters.indexTravelerGroup + 1, code: nodeAdditionalCollection.ValueOfSelect("CurrencyCode"), amount: nodeAdditionalCollection.ValueOfSelect("BaseFareDifference"), amountType: "ADC", purpose: "Base"}));
            nodeReshopDue.AppendChild(nodeByPassenger);
        }
        else if (nodeRefund){
            var nodeByAirline = parameters.domFlightPriceRS.CreateElementNode("ByAirline");
            nodeByAirline.AppendChild(buildNodeTotal({domFlightPriceRS: parameters.domFlightPriceRS, seqNumber: parameters.indexTravelerGroup + 1, code: nodeRefund.ValueOfSelect("CurrencyCode"), amount: nodeRefund.ValueOfSelect("BaseFareDifference"), amountType: "NOADC", purpose: "Base"}));
            nodeReshopDue.AppendChild(nodeByAirline);
        }
        else{
            var nodeByPassenger = parameters.domFlightPriceRS.CreateElementNode("ByPassenger");
            nodeByPassenger.AppendChild(buildNodeTotal({domFlightPriceRS: parameters.domFlightPriceRS, seqNumber: parameters.indexTravelerGroup + 1, code: parameters.nodeTravelerGroup.ValueOfSelect("../CurrencyCode"), amount: "0", amountType: "ADC", purpose: "Base"}));
            nodeReshopDue.AppendChild(nodeByPassenger);
        }

        var nodeTaxes;
        //Adds taxes from AdditionalCollection
        if (nodeAdditionalCollection && nodeAdditionalCollection.SelectSingle("Taxes/Tax"))
            nodeTaxes = buildNodeTaxes({domFlightPriceRS: parameters.domFlightPriceRS, nodeSource: nodeAdditionalCollection, isByAirline: false, nodeTaxes: null});
        //Adds taxes from Refund
        if (nodeRefund && nodeRefund.SelectSingle("Taxes/Tax"))
            nodeTaxes = buildNodeTaxes({domFlightPriceRS: parameters.domFlightPriceRS, nodeSource: nodeRefund, isByAirline: true, nodeTaxes: nodeTaxes});

        if (nodeTaxes)
            nodeReshopDue.AppendChild(nodeTaxes);

        return nodeReshopDue;
    };

    /**
     * Builds Total node for nodeByAirline or nodeByPassenger elements
     * @param {{domFlightPriceRS: xxDomDocument, seqNumber: Number, code: string, amount: string, amountType: string, purpose: string}} parameters
     * @return xxNode
     */
    var buildNodeTotal = function(parameters) {
        var nodeTotal = parameters.domFlightPriceRS.CreateElementNode("Total");
        if(parameters.seqNumber)
            nodeTotal.SetAttribute("ReissueSeqNbr", parameters.seqNumber);

        var nodeAmount = parameters.domFlightPriceRS.CreateElementNode("Amount");
        if(parameters.code)
            nodeAmount.SetAttribute("Code", parameters.code);
        nodeAmount.AppendChild(parameters.domFlightPriceRS.CreateTextNode(parameters.amount));
        nodeTotal.AppendChild(nodeAmount);

        if(parameters.amountType) {
            var nodeAmountType = parameters.domFlightPriceRS.CreateElementNode("AmountType");
            var strAmountType = parameters.amount == "0"? "NOADC": parameters.amountType;
            nodeAmountType.AppendChild(parameters.domFlightPriceRS.CreateTextNode(strAmountType));
            nodeTotal.AppendChild(nodeAmountType);
        }
        if(parameters.purpose) {
            var nodePurpose = parameters.domFlightPriceRS.CreateElementNode("Purpose");
            nodePurpose.AppendChild(parameters.domFlightPriceRS.CreateTextNode(parameters.purpose));
            nodeTotal.AppendChild(nodePurpose);
        }

        return nodeTotal;
    };

    /** Don't allow repricing of married segments if not all segments are selected.
    * @param {xxDomDocument} domRequest
    */
    function MarriedSegmentValidation(domRequest) {
        var odMarriedSegmets = domRequest.SelectNodes(domRequest.Root, "OriginDestination/Flight[@MarriedSegment]");
        if (odMarriedSegmets) {
            for (var iODFlight = 0; iODFlight < odMarriedSegmets.Count; iODFlight++) {
                var ODFlight = odMarriedSegmets.GetItem(iODFlight);
                if (ODFlight) {
                    var airGroupFlight = ODFlight.GetAttribute("AssociationID") ? domRequest.SelectSingle(domRequest.Root, "PNRViewRS/AirGroup/Flight[ElementNumber = '" + ODFlight.GetAttribute("AssociationID") + "']") : null;
                    if(airGroupFlight) {
                        var airGroupFlightMarriedSeg = airGroupFlight.GetAttribute("MarriedRef") ? domRequest.SelectNodes(domRequest.Root, "PNRViewRS/AirGroup/Flight[@MarriedRef = '" + airGroupFlight.GetAttribute("MarriedRef") + "']") : null;
                        if(airGroupFlightMarriedSeg) {
                            for (var iAirGroupMarriedSeg = 0; iAirGroupMarriedSeg < airGroupFlightMarriedSeg.Count; iAirGroupMarriedSeg++) {
                                var airGroupSeg = airGroupFlightMarriedSeg.GetItem(iAirGroupMarriedSeg);
                                if (airGroupSeg) {
                                    var odMarriedFlight = airGroupSeg.SelectSingle("ElementNumber") ? domRequest.SelectSingle(domRequest.Root, "OriginDestination/Flight[@AssociationID = '" + airGroupSeg.SelectSingle("ElementNumber").NormalizedText + "']") : null;
                                    if(!odMarriedFlight)
                                        throw "180000210";
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Builds Taxes node for nodeReshopDue element
     * @param {{domFlightPriceRS: xxDomDocument, nodeSource: xxNode, isByAirline: Boolean, nodeTaxes: xxNode}} parameters
     */
    var buildNodeTaxes = function(parameters) {
        var nodeTaxes = parameters.nodeTaxes;
        if(!nodeTaxes) {
            nodeTaxes = parameters.nodeTaxes = parameters.domFlightPriceRS.CreateElementNode("Taxes");
        }

        var nodeTotal = nodeTaxes.SelectSingle("Total");
        if(!nodeTotal) {
            if(parameters.isByAirline != null)
                if(!parameters.isByAirline)
                    parameters.nodeTaxes.SetAttribute("CollectionInd", "true");
                else
                    parameters.nodeTaxes.SetAttribute("RefundAllInd", "true");

            nodeTotal = parameters.domFlightPriceRS.CreateElementNode("Total");
            if(parameters.nodeSource.SelectSingle("CurrencyCode"))
                nodeTotal.SetAttribute("Code", parameters.nodeSource.ValueOfSelect("CurrencyCode"));
            nodeTotal.AppendChild(parameters.domFlightPriceRS.CreateTextNode(parameters.nodeSource.SelectSingle("Taxes").GetAttribute("Amount")));
            nodeTaxes.AppendChild(nodeTotal);
        }
        else {
            //Adds more taxes
            var amount = Number(nodeTotal.ValueOfSelect(".")) - Number(parameters.nodeSource.SelectSingle("Taxes").GetAttribute("Amount"));
            if((!parameters.isByAirline && amount < 0) || parameters.isByAirline && amount > 0)
                parameters.nodeTaxes.SetAttribute("CollectionInd", "true");
            else
                nodeTaxes.RemoveAttribute("CollectionInd");

            var nodeNewTotal = parameters.domFlightPriceRS.CreateElementNode("Total");
            if(parameters.nodeSource.SelectSingle("CurrencyCode"))
                nodeNewTotal.SetAttribute("Code", parameters.nodeSource.ValueOfSelect("CurrencyCode"));
            nodeNewTotal.AppendChild(parameters.domFlightPriceRS.CreateTextNode(amount > 0 ? amount.toString() : Math.abs(amount).toString()));
            nodeTotal.InsertAfter(nodeNewTotal);
            nodeTotal.Delete();
        }

        var nsTax = parameters.nodeSource.Select("Taxes/Tax");
        if(nsTax) {
            var nodeBreakdown = parameters.nodeTaxes.SelectSingle("Breakdown");
            if(!nodeBreakdown) {
                nodeBreakdown = parameters.domFlightPriceRS.CreateElementNode("Breakdown");
                parameters.nodeTaxes.AppendChild(nodeBreakdown);
            }
            for (var indexTax = 0; indexTax < nsTax.Count; indexTax++) {
                //populates each Tax element
                var nodeTaxFromSource = nsTax.GetItem(indexTax);
                var nodeTax = parameters.domFlightPriceRS.CreateElementNode("Tax");
                var nodeQualifier = parameters.domFlightPriceRS.CreateElementNode("Qualifier");
                if (parameters.isByAirline) {
                    nodeTax.SetAttribute("RefundInd", "true");
                    nodeQualifier.AppendChild(parameters.domFlightPriceRS.CreateTextNode("paid"));
                }
                else {
                    if(parameters.isByAirline != null)
                        nodeTax.SetAttribute("CollectionInd", "true");
                    if(nodeTaxFromSource.GetAttribute("Paid"))
                        nodeQualifier.AppendChild(parameters.domFlightPriceRS.CreateTextNode("paid"));
                    else
                        nodeQualifier.AppendChild(parameters.domFlightPriceRS.CreateTextNode("new"));
                }
                nodeTax.AppendChild(nodeQualifier);

                var nodeTaxAmount = parameters.domFlightPriceRS.CreateElementNode("Amount");
                if(nodeTaxFromSource.SelectSingle("CurrencyCode"))
                    nodeTaxAmount.SetAttribute("Code", nodeTaxFromSource.ValueOfSelect("CurrencyCode"));
                else if(parameters.nodeSource.SelectSingle("CurrencyCode"))
                    nodeTaxAmount.SetAttribute(parameters.nodeSource.ValueOfSelect("CurrencyCode"));
                nodeTaxAmount.AppendChild(parameters.domFlightPriceRS.CreateTextNode(nodeTaxFromSource.GetAttribute("Amount")));
                nodeTax.AppendChild(nodeTaxAmount);

                if(nodeTaxFromSource.ValueOfSelect("Nature")) {
                    var nodeNation = parameters.domFlightPriceRS.CreateElementNode("Nation");
                    nodeNation.AppendChild(parameters.domFlightPriceRS.CreateTextNode(nodeTaxFromSource.ValueOfSelect("Nature")));
                    nodeTax.AppendChild(nodeNation);
                }

                var nodeTaxCode = parameters.domFlightPriceRS.CreateElementNode("TaxCode");
                nodeTaxCode.AppendChild(parameters.domFlightPriceRS.CreateTextNode(nodeTaxFromSource.ValueOfSelect("Designator")));
                nodeTax.AppendChild(nodeTaxCode);

                var nsCollectionPoint = nodeTaxFromSource.Select("CollectionPoint");
                if(nsCollectionPoint) {
                    for (var indexCollectionPoint = 0; indexCollectionPoint < nsCollectionPoint.Count; indexCollectionPoint++) {
                        var nodeCollectionPointFromSource = nsCollectionPoint.GetItem(indexCollectionPoint);
                        var nodeCollectionPoint = parameters.domFlightPriceRS.CreateElementNode("CollectionPoint");
                        var nodeCurrCode = parameters.domFlightPriceRS.CreateElementNode("CurrCode");
                        nodeCurrCode.SetAttribute("NumberOfDecimals", nodeCollectionPointFromSource.SelectSingle("CurrencyCode").GetAttribute("NumberOfDecimals"));
                        nodeCurrCode.AppendChild(parameters.domFlightPriceRS.CreateTextNode(nodeCollectionPointFromSource.ValueOfSelect("CurrencyCode")));
                        nodeCollectionPoint.AppendChild(nodeCurrCode);

                        nodeCollectionPoint.AppendChild(nodeCollectionPointFromSource.SelectSingle("AirportAmount").Clone());
                        nodeCollectionPoint.AppendChild(nodeCollectionPointFromSource.SelectSingle("AirportCode").Clone());
                    }
                    nodeTax.AppendChild(nodeCollectionPoint);
                }
                if(nodeTaxFromSource.SelectSingle("LocalAmount"))
                    nodeTax.AppendChild(nodeTaxFromSource.SelectSingle("LocalAmount").Clone());
                if(nodeTaxFromSource.SelectSingle("Description"))
                    nodeTax.AppendChild(nodeTaxFromSource.SelectSingle("Description").Clone());
                nodeBreakdown.AppendChild(nodeTax);
            }
        }
        return nodeTaxes;
    };

    /**
     * Removes RF tax nodes
     * @param {xxNodeSet} nsTax
     */
    var removeRefundTaxes = function(nsTax){
        if(nsTax)
            for (var indexTax = 0; indexTax < nsTax.Count; indexTax++) {
                var nodeTax = nsTax.GetItem(indexTax);
                if(nodeTax.GetAttribute("Paid") == "RF")
                    nodeTax.Delete();
            }
    }

    /**
     * Validates and returns final pricing response
     * @param {xxDomDocument|string} flightPriceRS
     * @constructor
     */
    this.SetClientResponse = function(flightPriceRS) {

        var domFlightPriceRS = flightPriceRS;
        if (typeof(flightPriceRS) == "string") {
            domFlightPriceRS = new xxDomDocument();
            domFlightPriceRS.PreserveWhitespace = true;
            domFlightPriceRS.LoadXML(flightPriceRS);
        }

        this.DCResponseValidation(domFlightPriceRS);

        if (this.showLog) {
            this.getLog();

            domFlightPriceRS.Root.SetAttribute("duration", this.logs[this.logs.length - 1].substring(this.logs[this.logs.length - 1].indexOf(":") + 1));
        }

        SetClientResponse(domFlightPriceRS.XML);
    };

    /**
     * DC FlightPrice request validation
     */
    this.DCRequestValidation = function() {

        this.BaseRequestValidation();
        
		//Don't allow repricing of married segments if not all segments are selected
        if(!(this.IsAutoExchange()) && this.domRequest.Root.SelectSingle("PNRViewRS/AirGroup"))
            MarriedSegmentValidation(this.domRequest);

        // updates the ApplyPricing AppSetting
        this.UpdateAppSetting({key: "ApplyPricing", value: this.providerName});

        // returns cached pricing response
        var nodeFareCacheKey = this.domRequest.Root.SelectSingle("PricingInfo/FareCacheKey");
        if(nodeFareCacheKey) {
            this.doPrice = false;

            if(!this.domRequest.Root.SelectSingle("PricingInfo/@SchedChangeManuFare")) {
                var strCachedResponse = this.GetCachedPrice(nodeFareCacheKey.NormalizedText);
                if (!strCachedResponse)
                    throw "180002024#" + nodeFareCacheKey.NormalizedText + "|";

                if (this.domRequest.Root.SelectSingle("PricingInfo[@Reprice = 'N']") && this.domRequest.Root.SelectSingle("OptionalServices"))
                    strCachedResponse = strCachedResponse.AddXML(this.domRequest.Root.SelectSingle("OptionalServices").XML);

                this.SetClientResponse("<FlightPriceRS>" + strCachedResponse + "</FlightPriceRS>");
            }

        }
        else {
            this.doOBFees = this.domRequest.Root.SelectSingle("PricingInfo[./@OBFees = 'Y'")? true: false;
            this.doServices = this.domRequest.Root.SelectSingle("PricingInfo[./@RequestOptions = 'Y' or ./@PriceServicesOnly = 'Y']")? true: false;
            this.doPrice = this.domRequest.Root.SelectSingle("PricingInfo[not(./@RequestOptions = 'Y') and not(./@Price = 'N')]")? true: false;

            // checks for ONLY OB fees processing
            if (this.doOBFees && !this.doPrice && !this.doServices && (this.domRequest.Root.SelectSingle("PNRViewRS/BillingAndDeliveryData/FormOfPayment/CreditCard") || this.domRequest.Root.SelectSingle("TravelerIDs/CreditCard/CCNumber"))) {
                var nodeFareGroup = this.domRequest.Root.SelectSingle("PNRViewRS/FareGroup");
                if (nodeFareGroup) {
                    var domFlightPriceRS = new xxDomDocument();
                    domFlightPriceRS.LoadXML("<FlightPriceRS/>");

                    // appends all FareGroups matched by PricingInfo/SegmentIDRef
                    var nsSegmentIDRefs = this.domRequest.Root.Select("PricingInfo/SegmentIDRef");
                    if (nsSegmentIDRefs) {
                        for (var indexSegmentIDRef = 0; indexSegmentIDRef < nsSegmentIDRefs.Count; indexSegmentIDRef++) {
                            var strSegmentIDRef = nsSegmentIDRefs.GetItem(indexSegmentIDRef).NormalizedText;

                            var nodeSegmentElementNumber = this.domRequest.Root.SelectSingle("PNRViewRS/FareGroup/SegmentElementNumber[. = '" + strSegmentIDRef + "']");
                            if (nodeSegmentElementNumber) {
                                var strFareNumber = nodeSegmentElementNumber.Parent.GetAttribute("FareNumber");
                                if (strFareNumber) {
                                    if (!domFlightPriceRS.Root.SelectSingle("FareGroup[@FareNumber = '" + strFareNumber + "']"))
                                        domFlightPriceRS.Root.AppendChild(nodeSegmentElementNumber.Parent.Clone());
                                }
                                else {
                                    if (!domFlightPriceRS.Root.SelectSingle("FareGroup"))
                                        domFlightPriceRS.Root.AppendChild(nodeSegmentElementNumber.Parent.Clone());
                                }
                            }
                        }
                    }

                    // checks if no FareGroup was added throw error
                    if (!domFlightPriceRS.Root.SelectSingle("FareGroup"))
                        throw "180000011";

                    this.SetClientResponse(this.GetOBFees(domFlightPriceRS));
                }
            }

            // gets services
            if (this.doServices) {
                if (this.services) {
                    // gets services
                    this.GetServices();
                    if (this.gotServices) {
                        //  returns if ONLY services were requested
                        if (!this.doPrice)
                            this.SetClientResponse(this.domServiceListRS);
                    }
                    else {
                        // checks if request for services was pre booking to continue with pricing
                        if (!this.isNDC &&  (this.domRequest.Root.SelectSingle("PricingInfo[@RequestOptions = \"Y\"]") || (this.source == "WSI") || (this.source == "EW")))
                            this.doPrice = true;
                        else
                            throw "180000207";
                    }
                }
                else
                    if (this.domRequest.Root.SelectSingle("PricingInfo[@RequestOptions = \"Y\"]"))
                        this.doPrice = true;
            }

            if (!this.doOBFees && !this.doServices && !this.doPrice)
                throw "180000011";

            if ((this.domRequest.Root.GetAttribute("validated") != "true") && this.doPrice) {

                // validates Autoexchange
                if(this.IsAutoExchange() && !this.domRequest.Root.SelectSingle("TicketImageRS"))
                    throw "180000211";

                if (this.domRequest.Root.SelectSingle("PricingInfo/TaxExemption") && !this.preferenceTaxExemption)
                    AddInfoGroup({domResponse: this.domRequest, strText: "Tax exemption is not supported for this carrier."});

                // validates TaxExemption preference
                if (this.domRequest.Root.SelectSingle("PricingInfo/TaxExemption") && !this.preferenceTaxExemption)
                    this.domRequest.Root.SelectSingle("PricingInfo/TaxExemption").Delete();

                // appends brands info
                var strAirlineBrands = DecodeEx("AirlineBrandedFares", this.airlineId);
                if (strAirlineBrands) {
                    var domAirlineBrands = new xxDomDocument();
                    if (domAirlineBrands.LoadXML(strAirlineBrands))
                        this.domRequest.Root.AppendChild(domAirlineBrands.Root.SelectSingle("ce"));
                }

                // marks end of validation
                this.domRequest.Root.SetAttribute("validated", "true");

                if (this.showTrace)
                    TraceXml(__file__, "* Request validation", this.domRequest.XML);

                // updates string request from validated DOM request
                this.requestXML = this.domRequest.XML;
            }
        }
    };

    this.DCRequestValidation();
}

JsDCFareQuote.prototype = new JsBaseFareQuote();

/**
 * JsDCFareQuote object constructor for DC FareQuote transaction
 * @constructor
 */
function JsDCFareQuote() {

    /**
     * DC FareQuote request validation
     */
    this.DCRequestValidation = function() {

        this.BaseRequestValidation();

        if (this.domRequest.Root.GetAttribute("validated") != "true") {
            // marks end of validation
            this.domRequest.Root.SetAttribute("validated", "true");

            if (this.showTrace)
                TraceXml(__file__, "* Request validation", this.domRequest.XML);

            // updates string request from validated DOM request
            this.requestXML = this.domRequest.XML;
        }
    };

    this.DCRequestValidation();

    /**
     * DC FareQuote response validation
     * @param {xxDomDocument} domFareQuoteRS
     */
    this.DCResponseValidation = function(domFareQuoteRS) {

        this.BaseResponseValidation(domFareQuoteRS);
    };

    /**
     * Validates and returns final quote response
     * @param {xxDomDocument|string} fareQuoteRS
     * @constructor
     */
    this.SetClientResponse = function(fareQuoteRS) {

        var domFareQuoteRS = fareQuoteRS;
        if (typeof(fareQuoteRS) == "string") {
            domFareQuoteRS = new xxDomDocument();
            domFareQuoteRS.PreserveWhitespace = true;
            domFareQuoteRS.LoadXML(fareQuoteRS);
        }

        this.DCResponseValidation(domFareQuoteRS);

        if (this.showLog) {
            this.getLog();

            domFareQuoteRS.Root.SetAttribute("duration", this.logs[this.logs.length - 1].substring(this.logs[this.logs.length - 1].indexOf(":") + 1));
        }

        SetClientResponse(domFareQuoteRS.XML);
    };

    /**
     * Performs fare quote call for the configured pricing provider
     * @param {String} strFareQuote
     * @returns {xxDomDocument}
     */
    this.Quote = function(strFareQuote) {

        var domFareQuoteRS;
        if (this.provider && (this.provider.providerName == "TVP"))
            domFareQuoteRS = domFlightPriceRS = this.provider.Quote(this);
        else {
            // builds pricing provider tc
            var domPricingTC = BuildPricingTC({domTC: this.domTC, nodeProvider: this.GetProvider()});

            var pricingProvider = new JsXXServer(domPricingTC);
            pricingProvider.Stateless(true);

            domFareQuoteRS = pricingProvider.SendTransaction({strXXServerRequest: strFareQuote, endTransaction: true});
        }

        return domFareQuoteRS;
    };
}

JsDCFareRules.prototype = new JsBaseFareRules();

/**
 * JsDCFareRules object constructor for DC FareRules transaction
 * @constructor
 */
function JsDCFareRules() {

    /**
     * DC FareRules request validation
     */
    this.DCRequestValidation = function() {

        this.BaseRequestValidation();

        if (this.domRequest.Root.GetAttribute("validated") != "true") {
            // marks end of validation
            this.domRequest.Root.SetAttribute("validated", "true");

            if (this.showTrace)
                TraceXml(__file__, "* Request validation", this.domRequest.XML);

            // updates string request from validated DOM request
            this.requestXML = this.domRequest.XML;
        }
    };

    this.DCRequestValidation();

    /**
     * DC FareRules response validation
     * @param {xxDomDocument} domFareRulesRS
     */
    this.DCResponseValidation = function(domFareRulesRS) {

        this.BaseResponseValidation(domFareRulesRS);
    };

    /**
     * Validates and returns final rules response
     * @param {xxDomDocument|string} fareRulesRS
     * @constructor
     */
    this.SetClientResponse = function(fareRulesRS) {

        var domFareRulesRS = fareRulesRS;
        if (typeof(fareRulesRS) == "string") {
            domFareRulesRS = new xxDomDocument();
            domFareRulesRS.PreserveWhitespace = true;
            domFareRulesRS.LoadXML(fareRulesRS);
        }

        this.DCResponseValidation(domFareRulesRS);

        if (this.showLog) {
            this.getLog();

            domFareRulesRS.Root.SetAttribute("duration", this.logs[this.logs.length - 1].substring(this.logs[this.logs.length - 1].indexOf(":") + 1));
        }

        SetClientResponse(domFareRulesRS.XML);
    };

    /**
     * Performs fare rules call for the configured pricing provider
     * @param {String} strFareRulesRQ
     * @returns {xxDomDocument}
     */
    this.Rules = function(strFareRulesRQ) {

        var domFareRulesRS;
        if (this.provider && (this.provider.providerName == "TVP"))
            domFareRulesRS = domFlightPriceRS = this.provider.Rules(this);
        else {
            // builds pricing provider tc
            var domPricingTC = BuildPricingTC({domTC: this.domTC, nodeProvider: this.GetProvider()});

            var pricingProvider = new JsXXServer(domPricingTC);
            pricingProvider.Stateless(true);
            domFareRulesRS = pricingProvider.SendTransaction({strXXServerRequest: strFareRulesRQ, endTransaction: true});
        }

        return domFareRulesRS;
    };
}

JsDCTicketAutoRefundQuote.prototype = new JsBaseTicketAutoRefundQuote();

/**
 * JsDCAutoRefund object constructor for DC AutoRefund transaction
 * @constructor
 */
function JsDCTicketAutoRefundQuote() {

    /**
     * Stores response in cache if success
     * @param {xxDomDocument} domTicketAutoRefundQuoteRS
     */
    this.StoreAutoRefundInCache = function(domTicketAutoRefundQuoteRS) {

        var strCacheKey = CreateCARF();

        TraceXml(__file__, "* Response cached (RefundQuoteID:" + strCacheKey + ")", domTicketAutoRefundQuoteRS.XML);
        SetCacheData("RefundQuoteID", strCacheKey, domTicketAutoRefundQuoteRS.XML);

        // stores key in response
        domTicketAutoRefundQuoteRS.PutNode(domTicketAutoRefundQuoteRS.Root, "RefundQuoteID", strCacheKey);
    }

    /**
     * DC AutoRefund request validation
     */
    this.DCRequestValidation = function() {

        this.BaseRequestValidation();

        if (this.domRequest.Root.GetAttribute("validated") != "true") {

            // checks if transaction is supported by airline
            var enableAutoRefundTicketValue = this.GetAppSettingValue("EnableAutoRefundTicket");
            if (enableAutoRefundTicketValue && (enableAutoRefundTicketValue.indexOf(this.airlineId + "=Y") == -1))
                throw "1215";

            // marks end of validation
            this.domRequest.Root.SetAttribute("validated", "true");

            if (this.showTrace)
                TraceXml(__file__, "* Request validation", this.domRequest.XML);

            // updates string request from validated DOM request
            this.requestXML = this.domRequest.XML;
        }
    };

    this.DCRequestValidation();

    /**
     * DC AutoRefund response validation
     * @param {xxDomDocument} domTicketAutoRefundQuoteRS
     */
    this.DCResponseValidation = function(domTicketAutoRefundQuoteRS) {

        // stores response in cache if success
        if(domTicketAutoRefundQuoteRS.Root.SelectSingle("RefundData"))
            this.StoreAutoRefundInCache(domTicketAutoRefundQuoteRS);

        this.BaseResponseValidation(domTicketAutoRefundQuoteRS);
    };

    /**
     * Validates and returns final autoRefund response
     * @param {xxDomDocument|string} ticketAutoRefundQuoteRS
     * @constructor
     */
    this.SetClientResponse = function(ticketAutoRefundQuoteRS) {

        var domTicketAutoRefundQuoteRS = ticketAutoRefundQuoteRS;
        if (typeof(ticketAutoRefundQuoteRS) == "string") {
            domTicketAutoRefundQuoteRS = new xxDomDocument();
            domTicketAutoRefundQuoteRS.PreserveWhitespace = true;
            domTicketAutoRefundQuoteRS.LoadXML(autoRefundRS);
        }

        this.DCResponseValidation(domTicketAutoRefundQuoteRS);

        if (this.showLog)
            this.getLog();

        SetClientResponse(domTicketAutoRefundQuoteRS.XML);
    };

    /**
     * Performs AutoRefund call for the configured pricing provider
     * @param {String} strAutoRefund
     * @returns {xxDomDocument}
     */
    this.AutoRefund = function(strTicketAutoRefundQuote) {

        // builds pricing provider tc
        var domPricingTC = BuildPricingTC({domTC: this.domTC, nodeProvider: this.GetProvider()});

        var pricingProvider = new JsXXServer(domPricingTC);
        pricingProvider.Stateless(true);

        return pricingProvider.SendTransaction({strXXServerRequest: strTicketAutoRefundQuote, endTransaction: true});
    };
}
