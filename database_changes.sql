-- altering user table
ALTER TABLE cyb_user 
ADD CONSTRAINT unique_individual_id UNIQUE (individual_id);
--------------------------------------------------------------------------------
-- altering designation
-- first check for duplicat
select *,count(*) as slug_number
from cyb_designation
group by slug
having count(*) > 1

-- delete dublicate 
DELETE FROM cyb_designation
WHERE id NOT IN (
    SELECT MIN(id)
    FROM cyb_designation
    GROUP BY slug
);


ALTER TABLE cyb_designation
ADD CONSTRAINT slug UNIQUE (slug)

ALTER TABLE cyb_designation
MODIFY COLUMN create_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN modify_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP;

-------------------------------------------------------------------------------------
-- department update

ALTER TABLE cyb_department
MODIFY COLUMN create_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN modify_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP;

-----------------------------------------------------------------------------------
-- user_experience

ALTER TABLE cyb_user_experience 
MODIFY COLUMN create_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN modify_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP;

