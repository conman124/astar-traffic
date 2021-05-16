# astar-traffic

This is a simple traffic simulator that uses A* to calculate routes.  It creates a number of vehicles that each choose a
random start road intersection and a random finish intersection.  The A* heuristic is the L2 distance between two intersections.
The actual speed is dependent on the number of other vehicles on the road segment, so it is an example of emergent behavior caused
by the agents not having full information about the other agents.  The path finder can also estimate the road congestion and try
to avoid congested routes.

Go to [https://conman124.github.io/astar-traffic](https://conman124.github.io/astar-traffic) for a demo.  You can import a map
(download from the repo) or create your own by using the mouse.  Use number keys 1-3 to set the size of the road (determines how many
vehicles can travel on it without needing to slow down) and the up/down keys to change the speed limit.  Every 50th vehicle will be
drawn in red to help identify individual vehicles.
