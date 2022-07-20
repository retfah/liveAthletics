/**
 * Two approaches could be used for the disciplines:
 * 1) It is (currently) not intended that every view that shows a discipline must be connected to the disciplines room. This would be unnecessary complex, since the disciplines actually hardly change. Thus, it is intended that a list of disciplines with the correct translations is injected on the server. The client will only get this one translated list already injected into the html/javascript page. 
 * 2) The alternative would be that the server provides (dynamic) views for every language.
 * -> Eventually the two approaches can be combined in one: The disciplines to be injected on the server are provided from views and not as special lists maintained by the room itself. (I currently dont know yet what is simpler.)
 * A further differentiation could be made for indoor/outdoor discplines: only inject a list of disciplines that suit the competition and that are active (if we need this...)
 */

 