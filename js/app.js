'use strict';

function init() {

    var MapViewModel = function() {
        var self = this
        self.infoMarker = null;
        self.reviews = ko.observableArray();
        self.location = ko.observableArray();

        // Google map to display NYC
        self.map = new google.maps.Map(document.getElementById('map'), {
            center: {
                lat: 38.883886,
                lng: -76.928307
            },
            zoom: 14
        });

        self.updateList = function(businessId) {
            self.yelp(businessId, null);
        };

        self.yelp = function(businessId, marker) {
            var auth = {
                consumerKey: "XpSlKTj0LWfL758fp_QNPA",
                consumerSecret: "8V8VyWB2JrfJaiYACNe54z7w6JE",
                accessToken: "CvLG9E-sKgK3Cu8dioQ1tMo6RhSklfLx",
                accessTokenSecret: "jMJ_5VKK_89Kz_HHhP7YGeMw9Zw",
                serviceProvider: {
                    signatureMethod: "HMAC-SHA1"
                }
            };
            var yelp_url = 'https://api.yelp.com/v2/business/' + businessId;

            var parameters = {
                oauth_consumer_key: auth.consumerKey,
                oauth_token: auth.accessToken,
                oauth_nonce: nonce_generate(),
                oauth_timestamp: Math.floor(Date.now() / 1000),
                oauth_signature_method: 'HMAC-SHA1',
                oauth_version: '1.0',
                callback: 'cb' // This is crucial to include for jsonp implementation in AJAX or else the oauth-signature will be wrong.
            };

            var encodedSignature = oauthSignature.generate('GET', yelp_url, parameters, auth.consumerSecret, auth.accessTokenSecret);
            parameters.oauth_signature = encodedSignature;
            var selectedMarker = null;
            self.markers().forEach(function(currentmarker) {
                if (currentmarker.yelp_id === businessId) {
                    selectedMarker = currentmarker;
                    currentmarker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
                } else {
                    currentmarker.setIcon('http://maps.google.com/mapfiles/ms/icons/purple-dot.png');
                }
            });

            var errorTimeout = setTimeout(function() {
                alert("Something went wrong");
            }, 8000);

            $.ajax({
                url: yelp_url,
                data: parameters,
                cache: true, // This is crucial to include as well to prevent jQuery from adding on a cache-buster parameter "_=23489489749837", invalidating our oauth-signature
                dataType: 'jsonp',
                success: function(results) {
                    clearTimeout(errorTimeout);
                    self.business(results);
                    self.location(results.location.display_address);
                    self.reviews([]);
                    results.reviews.forEach(function(review) {
                        self.reviews.push({
                            review: review.excerpt + " - " + review.user.name
                        });
                    });

                    var contentString = '<div class="content">' +
                        '<h1 id="firstHeading" class="firstHeading">' + results.name + '</h1>' +
                        '<div id="bodyContent">' +
                        '<p>' + results.reviews[results.reviews.length - 1].excerpt + " - " + results.reviews[results.reviews.length - 1].user.name + '</p>' +
                        '<p><a href="' + results.url + '">' + results.url + '</a> ' +
                        '</div>' +
                        '</div>';
                    if (self.InfoMarker != null) {
                        self.InfoMarker.close();
                    }
                    self.InfoMarker = new google.maps.InfoWindow({
                        content: contentString
                    });
                    self.InfoMarker.open(mapview.map, selectedMarker);

                },
                fail: function() {
                    alert("Problem occured!");
                }
            });
        };

        self.markers = new ko.observableArray();
        self.searchFilter = ko.observable('');
        self.business = ko.observable('');

        /** Funtion to create a locations  for markers array
         * @param title string the name of the location
         * @param latitude float the latitute to place the marker
         * @param longitude float the longitude of the marker
         * @param detail string TODO the information for the infoWindow
         * @return an object of the location added
         */
        self.createLocation = function(title, latitude, longitude, business_id) {
            var location = {
                position: new google.maps.LatLng(latitude, longitude),
                title: title,
                visible: true,
                map: self.map,
                yelp_id: business_id
            };

            // add marker to array of markers
            self.markers.push(new google.maps.Marker(location));
            self.markers()[self.markers().length - 1].setAnimation(null);
            self.markers()[self.markers().length - 1].setIcon('http://maps.google.com/mapfiles/ms/icons/purple-dot.png');
            // add click function to the new marker
            self.markers()[self.markers().length - 1].addListener('click', function() {
                var marker = this;
                if (marker.getAnimation() !== null) {
                    marker.setAnimation(null);
                } else {
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                    setTimeout(function() {
                        marker.setAnimation(null);
                    }, 1400);

                }
                self.yelp(this.yelp_id, this);
            });

            // return the object
            return location;
        };

        self.coordinates = [
            new self.createLocation('Malolo Bed and Breakfast', 38.883886, -76.928307, 'malolo-bed-and-breakfast-washington'),
            new self.createLocation('Americas Best Wings', 38.889503, -76.936686, 'americas-best-wings-washington'),
            new self.createLocation('Subway', 38.889177, -76.936536, 'subway-washington-134'),
            new self.createLocation('Dennys', 38.890419, -76.938367, 'dennys-washington'),
            new self.createLocation('Rosebuds BBQ', 38.885388, -76.917883, 'rosebuds-bbq-capitol-heights'),
            new self.createLocation('Capital Szechuan', 38.889323, -76.925617, 'capital-szechuan-washington'),
            new self.createLocation('McDonalds', 38.893407, -76.949861, 'mcdonalds-washington-2'),
            new self.createLocation('McDonalds', 38.901189, -76.941621, 'mcdonalds-washington-55'),
            new self.createLocation('Wendys', 38.902324, -76.941578, 'wendys-washington-4'),
            new self.createLocation('Dominos Pizza', 38.892146, -76.951782, 'dominos-pizza-washington-15'),
            new self.createLocation('Sala Thai', 38.895311, -76.949999, 'sala-thai-washington-10'),
            new self.createLocation('Dannys Sub Shop', 38.890910, -76.952790, 'dannys-sub-shop-and-chinese-food-washington-2')

            ];



        /**
         * Function to handle input from search field. Automatically updates the locations based on search text
         * The function updates the sidelist and the visible markers based up what the user wishes to filter
         * @param searchValue the newly input text to the search field
         */
        self.searchFilter.subscribe(function(searchValue) {
            searchValue = searchValue.toLowerCase();
            var change = false;
            ko.utils.arrayForEach(self.markers(), function(marker) {
                var text = marker.title.toLowerCase();

                if (text.search(searchValue) === -1) {
                    if (marker.getVisible() === true) {
                        change = true;
                    }
                    marker.setVisible(false);
                } else {
                    if (marker.getVisible() === false) {
                        change = true;
                    }
                    marker.setVisible(true);
                }

            });
            if (change === true) {
                var data = self.markers().slice(0);
                self.markers([]);
                self.markers(data);
            }
        });

    };

    // Activate knockout
    var mapview = new MapViewModel();
    ko.applyBindings(mapview);
}

function nonce_generate(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// This function takes in a COLOR, and then creates a new marker
      // icon of that color. The icon will be 21 px wide by 34 high, have an origin
      // of 0, 0 and be anchored at 10, 34).
      function makeMarkerIcon(markerColor) {
        var markerImage = new google.maps.MarkerImage(
          'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
          '|40|_|%E2%80%A2',
          new google.maps.Size(21, 34),
          new google.maps.Point(0, 0),
          new google.maps.Point(10, 34),
          new google.maps.Size(21,34));
        return markerImage;
      }