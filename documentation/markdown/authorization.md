# Authorization

Authorization is usually handled by the `AuthorizingHttpHandler`,
and goes in the following steps:

 1. Identify the credentials of the agent making the call.
 2. Extract which access modes are needed for which resources.
 3. Reading the permissions the agent has.
 4. Compare the above results to see if the request is allowed.

## Authentication
There are multiple `CredentialsExtractor`s that each determine identity in a different way.
Potentially multiple extractors can apply,
making a requesting agent have multiple credentials. 
The `DPoPWebIdExtractor` is most relevant for the [Solid-OIDC specification](https://solid.github.io/solid-oidc/),
as it parses the access token generated by a Solid Identity Provider.
Besides that there are always the public credentials, which everyone has.
There are also some debug extractors that can be used to simulate credentials,
which can be enabled as different options through the `config/ldp/authentication` imports.

If successful, a `CredentialsExtractor` will return a key/value map
linking the type of credentials to their specific values.

## Modes extraction
Access modes are a predefined list of `read`, `write`, `append`, `create` and `delete`.
The `ModesExtractor`s determine which modes will be necessary and for which resources,
based on the request contents.
The `MethodModesExtractor` determines modes based on the HTTP method.
A GET request will always need the `read` mode for example.
Specifically for PATCH requests there are extractors for each supported PATCH type,
such as the `N3PatchModesExtractor`,
which parses the N3 Patch body to know if it will add new data or only delete data.

## Permission reading
`PermissionReaders` take the input of the above to determine which permissions are available for which credentials.
The modes from the previous step are not yet needed,
but can be used as optimization as we only need to know if we have permission on those modes.
Each reader returns all the information it can find based on the resources and modes it receives.
Those results then get combined in the `UnionPermissionReader`.
In the default configuration the following readers are combined.

* `PathBasedReader` rejects all permissions for certain paths, to prevent access to internal data.
* `OwnerPermissionReader` grants control permissions to agents that are trying to access data in a pod that they own.
* `AuxiliaryReader` handles all permissions for auxiliary resources by requesting those of the subject resource if necessary.
* `ParentContainerReader` checks the necessary permissions on a parent container when creating or deleting a resource.
* `WebAclAuxiliaryReader` determines permissions on ACL resources by requesting if the subject resource has control permissions.
* `WebAclReader` reads out the relevant ACL resource to read out the defined permissions.

All of the above is if you have WebACL enabled.
It is also possible to always grant all permissions for debugging reasons
by changing the authorization import to `config/ldp/authorization/allow-all.json`.

## Authorization
All the results of the previous steps then get combined to either allow or reject a request.
If no permissions are found for a requested mode,
or they are explicitly forbidden,
a 401/403 will be returned,
depending on if the agent was logged in or not.
