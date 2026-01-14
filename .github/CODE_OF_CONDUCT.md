## Download collected statistics in format `json`

* 
    ``` nix
    git archive -v --format=tar.gz --output=./121941.tar.gz data:roi ./121941.json
    # or
    git clone -b data ssh://git@github.com:443/<your_username>/scrape-json.git .
    # or
    git archive -v --format=tar.gz --output=./121941.tar.gz master:data roi/121941.json
    ```


## Preparing to work with a local copy of the repository

* Download the master branch from the remote repository
    ``` nix
    git clone --single-branch -c core.autocrlf=input ssh://git@github.com:443/<your_username>/scrape-json.git .
    ```
* Check line breaks for text files in the remove repository
    ``` nix
    git ls-files --eol
    ```
* Set `user.email` to sing commits
    ``` nix
    git config --local user.name "<your_username>"
    git config --local user.email <your_id>+<your_username>@users.noreply.github.com
    ```
