# Project Overview
The purpose of this project is to create a simple and intuitive ordering system that makes it easy for a small start up to process orders efficiently. 

THe primary focus of the app is to be extremely reliable and very easy to use, with a UI that makes it simple for the team creating the Orders to batch and group orders. 

The secondary focus of the app is to provide analytics around performance, wait times, and algorithms that can look back on an Event and propose a more optimal preparing strategy, based on observed order times, etc. 

# Entities
These are the following entities:
1) Shop
Different shops can create an "account". A shop has a name and a password. 
2) Event
An Event is a day where the shop is open and accepting orders. 
Every Event has a name, a date, and an id (internal facing). 
3) Menu
Every Event has a Menu. The Shop will have a "default" Menu, but it can be overriden depending on the Event.
The Menu has Items
4) Item
A MenuItem has a Price, a Name, and a Code. A Code is a short name (e.g. 1 or A) for a Item and will be used when grouping and displaying Items. 
5) Customer
A Customer is anyone who creates an Order. There is not necesarily a Customer account (the person taking orders for the Shop will just create entries on the spot). Each Customer has a name and (optionally) a phone number. 
6) Order
An Order contains a set of Items, a Customer, and three Timestamps: created_at, ready_at, picked_up_at. 
7) OrderItem
An OrderItem is an Item included in an Order. It should map to an Item in the Menu. An OrderItem may include modifications (e.g. low ice, no cream, etc). 

# Screens
Besides the basic login screen, Shop/Menu/Item editing screens, and offline analytics screens, there are 2 main screens:
1) Home Screen
This should almost be like a dynamically sized grid, where the rows are Orders, and the columns are Item Codes. The person completing the Orders should be able to easily see the concentration of Orders based on time (e.g. when the Orders were placed) and Item type (the Codes). 

The person Completing Orders has 2 Options:
    1. Mark Order as Ready
    2. Mark Order as Picked Up

    There must be an intutive way for users to do this. 

The home screen should operate like a "Timeline", where the person taking Orders can look at previous orders by scrolling up. The Screen should auto-scroll as Orders are Picked Up. 

There should also be an Option on this page to Create a new Order. This is what the Order intake person will press to enter the IntakeOrder screen. 

There should also be high level metadata about how many orders are in the queue and average stats about order completion time. 

2) IntakeOrder
This should be an extremely intuitive screen that the person creating Orders can use. It should operate kind of like DoorDash, where the menu is already obvious and the person creating Orders can just click on a + or - button to add items to the Order. After they have finished adding all of the Items, the next screen should be the "finalize" screen. Here, each Item should be listed as one record. There is an option to add free form text modifications to each Item. There is also the option to enter a name and a phone number. There is a button on this screen to "Submit" the Order. 

# Technology
Please implement this in TypeScript. We do not necesarily need a dedicated Backend; it should be relatively easy to fit all of this in a FrontEnd only app since most of the computation is lightweight. 

# Usage 
The website is meant to be shown on iPhone and iPad screens with Safari and Chrome. Make sure the UI is optimal for those use cases. 

# Guidelines
Please test code thoroughly, especially edge cases. Correctness and reliability are paramount. 
