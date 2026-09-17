@voterlist_204485.pdf

This PDF contains a list of names and addresses for voters to whom I will send hand written postcards. I want to create a website that helps people track their progress while writing postcards and makes it easier to see the name and address.

The site should be built with HTML/CSS/Typescript. I am open to using other libraries when they make sense.

Requirements:
- The site MUST be static. I plan to host it on github pages
- The site MUST NOT make any network requests other than to load scripts or libraries

Features:
1) the user must be able to upload a PDF that contains names and addresses. For example @voterlist_204485.pdf
2) The PDF must be parsed and the names/addresses extracted
3) The names and addresses must be saved to local storage
4) There should be a confirmation message letting the user know whether the import suceeded and how many names/address pairs were found
5) after import, the user should see a kanban board with the following columns: TODO, Writing, Written, Stamp Applied, Mailed
6) The TODO column should be populated with a "card" for each name/address pair parsed from the PDF. 
7) A card can be drag/dropped between columns of the kanban board, indicating its current status
8) When a card is clicked on, the card should become very large in the center of the screen and:
-  show the name/address for that card in very large font so that it is easy to read. The name/address should be formatted as if it were being written no a postcard or envelope to be delivered by the postal service
- have an X to close out the detail view for that single card and go back to the kanban view
- have an option to close the detail view AND automatically move that card to the next column in the kanban board
