# cdk-fargate-apigateway-http-api

This AWS Cloud Development Kit (CDK) stack demonstrates how-to publish an API running on private subnet and AWS Fargate to Amazon API Gateway.

It's also worth noting that this solution utilizes VPC Endpoints instead of NAT Gateways.

Services used in this solution:

- Amazon API Gateway HTTP API
- Amazon API Gateway VPC Link
- Amazon VPC endpoints
- AWS Cloud Map (Service Discovery)
- AWS Fargate

Inspired by: https://aws.amazon.com/blogs/compute/configuring-private-integrations-with-amazon-api-gateway-http-apis/

By `curl`in the url outputted by `cdk deploy`, you should see something like this:

```
% curl https://9s2d6vxtyc.execute-api.eu-west-1.amazonaws.com/

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Honk!</title>
</head>
<body>
<pre>
                                   ___
                               ,-""   ` .     < Honk from ip-10-0-0-126.eu-west-1.compute.internal !>
                             ,'  _   e )`-._ /
                            /  ,' `-._<.===-'
                           /  /
                          /  ;
              _          /   ;
 (`._    _.-"" ""--..__,'    |
 <_  `-""                     \
  <`-                          :
   (__   <__.                  ;
     `-.   '-.__.      _.'    /
        \      `-.__,-'    _,'
         `._    ,    /__,-'
            ""._\__,'< <____
                 | |  `----.`.
                 | |        \ `.
                 ; |___      \-``
                 \   --<
                  `.`.<
                    `-'

</pre>
</body>
</html>
```
